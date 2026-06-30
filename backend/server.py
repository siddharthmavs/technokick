from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import io
import json
import math
import random
import itertools
import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal, Any

import jwt
import bcrypt
import httpx
import pandas as pd
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, status, BackgroundTasks
from fastapi.responses import StreamingResponse
from pywebpush import webpush, WebPushException
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError
from pydantic import BaseModel, Field, ConfigDict, EmailStr


# ---------- DB ----------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


# ---------- App ----------
app = FastAPI(title="TechnoKick 2026 API")
api_router = APIRouter(prefix="/api")

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGO = "HS256"
TOKEN_TTL_HOURS = 24 * 7  # 7 days

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("technokick")


# ---------- Helpers ----------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


RECAPTCHA_SECRET_KEY = os.environ.get("RECAPTCHA_SECRET_KEY", "")


async def verify_recaptcha(token: Optional[str]):
    """Verify a Google reCAPTCHA v2 token. No-ops with a warning if the secret key isn't configured."""
    if not RECAPTCHA_SECRET_KEY:
        logger.warning("RECAPTCHA_SECRET_KEY not set — skipping CAPTCHA verification")
        return
    if not token:
        raise HTTPException(status_code=400, detail="Please complete the CAPTCHA.")
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                "https://www.google.com/recaptcha/api/siteverify",
                data={"secret": RECAPTCHA_SECRET_KEY, "response": token},
            )
        result = r.json()
    except Exception as e:
        logger.error(f"reCAPTCHA verification request failed: {e}")
        raise HTTPException(status_code=400, detail="CAPTCHA verification failed. Please try again.")
    if not result.get("success"):
        raise HTTPException(status_code=400, detail="CAPTCHA verification failed. Please try again.")


def create_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": now_utc() + timedelta(hours=TOKEN_TTL_HOURS),
        "iat": now_utc(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(auth[7:])
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def strip_id(doc: Optional[dict]) -> Optional[dict]:
    if doc is None:
        return None
    doc.pop("_id", None)
    return doc


# ---------- Models ----------
class UserPublic(BaseModel):
    id: str
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    company: Optional[str] = None
    role: str
    created_at: str


class UserSignupIn(BaseModel):
    phone: str
    name: str
    company: Optional[str] = None
    password: str
    recaptcha_token: Optional[str] = None


class UserLoginIn(BaseModel):
    phone: str
    password: str
    recaptcha_token: Optional[str] = None


class AdminLoginIn(BaseModel):
    email: EmailStr
    password: str


class AuthOut(BaseModel):
    token: str
    user: UserPublic


class PS5RegistrationIn(BaseModel):
    player_name: str
    company_name: str
    contact: str


class MatchIn(BaseModel):
    player_a: str
    player_a_company: str
    player_b: str
    player_b_company: str
    scheduled_at: str  # ISO
    station: str
    round_label: str = "Group A"  # "Group A".."Group H", "Round of 16", "Quarterfinal", "Semifinal", "Third Place", "Final"


class MatchScoreIn(BaseModel):
    score_a: int
    score_b: int
    status: Literal["upcoming", "live", "completed"] = "completed"
    player_of_match: Optional[str] = None


class FixtureIn(BaseModel):
    team_a: str
    team_a_flag: str  # emoji or code
    team_b: str
    team_b_flag: str
    kickoff_at: str  # ISO
    venue: str
    stage: str  # "Group A", "QF", etc.


class QuestionIn(BaseModel):
    date: str  # YYYY-MM-DD
    fixture_id: str
    text: str
    type: Literal["dropdown", "numeric_score", "multi_select", "radio"]
    options: List[str] = Field(default_factory=list)
    points: int = 10
    order: int = 0


class QuestionResultIn(BaseModel):
    correct_answer: Any  # str, list, or dict {"a": int, "b": int}


class SubmissionIn(BaseModel):
    answers: List[dict]  # [{question_id, answer}]


class AnnouncementIn(BaseModel):
    title: str
    body: str


class SettingsIn(BaseModel):
    tnc_content: Optional[str] = None
    scoring: Optional[dict] = None


# ---------- Auth Endpoints ----------
@api_router.post("/auth/user/signup", response_model=AuthOut)
async def user_signup(data: UserSignupIn):
    await verify_recaptcha(data.recaptcha_token)
    phone = data.phone.strip()
    name = data.name.strip()
    password = data.password
    if not phone or not name:
        raise HTTPException(status_code=400, detail="Phone and name are required")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    existing = await db.users.find_one({"phone": phone, "role": "user"})
    if existing:
        raise HTTPException(status_code=400, detail="An account with this phone number already exists. Please log in.")
    user = {
        "id": str(uuid.uuid4()),
        "name": name,
        "phone": phone,
        "company": (data.company or "").strip() or None,
        "role": "user",
        "password_hash": hash_password(password),
        "created_at": now_utc().isoformat(),
    }
    try:
        await db.users.insert_one(user)
    except DuplicateKeyError:
        raise HTTPException(status_code=400, detail="An account with this phone number already exists. Please log in.")
    user = strip_id(user)
    user.pop("password_hash", None)
    return AuthOut(token=create_token(user["id"], "user"), user=UserPublic(**user))


@api_router.post("/auth/user/login", response_model=AuthOut)
async def user_login(data: UserLoginIn):
    await verify_recaptcha(data.recaptcha_token)
    phone = data.phone.strip()
    user = await db.users.find_one({"phone": phone, "role": "user"})
    if not user or not verify_password(data.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid phone number or password")
    user = strip_id(user)
    user.pop("password_hash", None)
    return AuthOut(token=create_token(user["id"], "user"), user=UserPublic(**user))


@api_router.post("/auth/admin/login", response_model=AuthOut)
async def admin_login(data: AdminLoginIn):
    user = await db.users.find_one({"email": data.email.lower(), "role": "admin"})
    if not user or not verify_password(data.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user = strip_id(user)
    user.pop("password_hash", None)
    return AuthOut(token=create_token(user["id"], "admin"), user=UserPublic(**user))


@api_router.get("/auth/me", response_model=UserPublic)
async def auth_me(user: dict = Depends(get_current_user)):
    return UserPublic(**user)


# ---------- PS5 Registrations ----------
@api_router.post("/ps5/registrations")
async def create_registration(data: PS5RegistrationIn, user: dict = Depends(get_current_user)):
    existing = await db.ps5_registrations.find_one({"user_id": user["id"]})
    if existing:
        raise HTTPException(status_code=400, detail="You have already registered. Edit your existing registration from the dashboard.")
    reg = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "player_name": data.player_name.strip(),
        "company_name": data.company_name.strip(),
        "contact": data.contact.strip(),
        "group": None,
        "payment_status": "pending",
        "created_at": now_utc().isoformat(),
        "edited_at": None,
    }
    await db.ps5_registrations.insert_one(reg)
    return strip_id(reg)


@api_router.get("/ps5/registrations/mine")
async def my_registration(user: dict = Depends(get_current_user)):
    reg = await db.ps5_registrations.find_one({"user_id": user["id"]}, {"_id": 0})
    return reg


@api_router.put("/ps5/registrations/mine")
async def update_my_registration(data: PS5RegistrationIn, user: dict = Depends(get_current_user)):
    reg = await db.ps5_registrations.find_one({"user_id": user["id"]})
    if not reg:
        raise HTTPException(status_code=404, detail="No registration found")
    update = {
        "player_name": data.player_name.strip(),
        "company_name": data.company_name.strip(),
        "contact": data.contact.strip(),
        "edited_at": now_utc().isoformat(),
    }
    await db.ps5_registrations.update_one({"id": reg["id"]}, {"$set": update})
    reg.update(update)
    return strip_id(reg)


@api_router.delete("/ps5/registrations/mine")
async def delete_my_registration(user: dict = Depends(get_current_user)):
    res = await db.ps5_registrations.delete_one({"user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="No registration found")
    return {"deleted": True}


# ---------- PS5 Matches & Bracket ----------
@api_router.get("/ps5/matches")
async def list_matches():
    matches = await db.ps5_matches.find({}, {"_id": 0}).sort("scheduled_at", 1).to_list(500)
    return matches


@api_router.get("/ps5/matches/mine")
async def my_matches(user: dict = Depends(get_current_user)):
    reg = await db.ps5_registrations.find_one({"user_id": user["id"]}, {"_id": 0})
    if not reg:
        return []
    pname = reg.get("player_name")
    matches = await db.ps5_matches.find(
        {"$or": [{"player_a": pname}, {"player_b": pname}]},
        {"_id": 0}
    ).sort("scheduled_at", 1).to_list(100)
    return matches


@api_router.get("/ps5/points-table")
async def points_table():
    """Per-group player standings, FIFA World Cup style."""
    groups: dict[str, dict[str, dict]] = {}

    def row(group: str, player: str, company: str):
        g = groups.setdefault(group, {})
        if player not in g:
            g[player] = {"player": player, "company": company, "played": 0, "won": 0, "drawn": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "points": 0}
        return g[player]

    regs = await db.ps5_registrations.find({"group": {"$nin": [None, ""]}}, {"_id": 0}).to_list(1000)
    for r in regs:
        row(f"Group {r['group']}", r["player_name"], r.get("company_name", ""))

    matches = await db.ps5_matches.find({"status": "completed", "round_label": {"$regex": "^Group"}}, {"_id": 0}).to_list(500)
    for m in matches:
        a = row(m["round_label"], m["player_a"], m.get("player_a_company", ""))
        b = row(m["round_label"], m["player_b"], m.get("player_b_company", ""))
        sa, sb = m.get("score_a", 0), m.get("score_b", 0)
        a["played"] += 1; b["played"] += 1
        a["gf"] += sa; a["ga"] += sb
        b["gf"] += sb; b["ga"] += sa
        if sa > sb:
            a["won"] += 1; a["points"] += 3; b["lost"] += 1
        elif sa < sb:
            b["won"] += 1; b["points"] += 3; a["lost"] += 1
        else:
            a["drawn"] += 1; b["drawn"] += 1; a["points"] += 1; b["points"] += 1

    out = []
    for g in sorted(groups.keys()):
        rows = list(groups[g].values())
        for r in rows:
            r["gd"] = r["gf"] - r["ga"]
        rows.sort(key=lambda r: (-r["points"], -r["gd"], -r["gf"], r["player"]))
        out.append({"group": g, "rows": rows})
    return out


@api_router.get("/ps5/groups")
async def list_groups():
    """Public view of the group draw."""
    regs = await db.ps5_registrations.find({}, {"_id": 0}).sort("player_name", 1).to_list(1000)
    groups: dict[str, list] = {}
    unassigned = []
    for r in regs:
        item = {"player_name": r["player_name"], "company_name": r.get("company_name", ""), "payment_status": r.get("payment_status")}
        if r.get("group"):
            groups.setdefault(r["group"], []).append(item)
        else:
            unassigned.append(item)
    return {"groups": [{"group": k, "players": groups[k]} for k in sorted(groups)], "unassigned": unassigned}


# ---------- Fixtures (real WC matches for predictions) ----------
@api_router.get("/fixtures")
async def list_fixtures():
    fixtures = await db.fixtures.find({}, {"_id": 0}).sort("kickoff_at", 1).to_list(500)
    return fixtures


# ---------- Daily Predictions ----------
@api_router.get("/predictions/today")
async def predictions_today(user: dict = Depends(get_current_user)):
    today = now_utc().strftime("%Y-%m-%d")
    questions = await db.questions.find({"date": today}, {"_id": 0}).sort("order", 1).to_list(50)
    # attach fixtures
    fixture_ids = list({q["fixture_id"] for q in questions})
    fixtures = {f["id"]: f for f in await db.fixtures.find({"id": {"$in": fixture_ids}}, {"_id": 0}).to_list(50)}
    # user's submissions for today
    subs = await db.submissions.find({"user_id": user["id"], "date": today}, {"_id": 0}).to_list(50)
    sub_map = {s["question_id"]: s for s in subs}
    # Window: 10AM to 8PM IST. We will compute open/close on the frontend too but include server flags.
    return {
        "date": today,
        "questions": questions,
        "fixtures": list(fixtures.values()),
        "submissions": sub_map,
    }


@api_router.post("/predictions/submit")
async def predictions_submit(data: SubmissionIn, user: dict = Depends(get_current_user)):
    today = now_utc().strftime("%Y-%m-%d")
    # Check window: 10:00 - 20:00 IST. IST = UTC+5:30. So 04:30 UTC to 14:30 UTC.
    # We'll check window using the admin setting if present.
    setting = await db.settings.find_one({"id": "window"}, {"_id": 0}) or {}
    start_hour_utc = setting.get("start_hour_utc", 4.5)
    end_hour_utc = setting.get("end_hour_utc", 14.5)
    now = now_utc()
    cur_hour = now.hour + now.minute / 60
    if not (start_hour_utc <= cur_hour <= end_hour_utc):
        if not setting.get("always_open", False):
            raise HTTPException(status_code=403, detail="The predictions window is closed. It's open daily 10AM–8PM IST.")

    for ans in data.answers:
        qid = ans.get("question_id")
        if not qid:
            continue
        # upsert
        existing = await db.submissions.find_one({"user_id": user["id"], "question_id": qid})
        doc = {
            "user_id": user["id"],
            "question_id": qid,
            "date": today,
            "answer": ans.get("answer"),
            "submitted_at": now_utc().isoformat(),
        }
        if existing:
            await db.submissions.update_one({"_id": existing["_id"]}, {"$set": doc})
        else:
            doc["id"] = str(uuid.uuid4())
            doc["points_earned"] = 0
            await db.submissions.insert_one(doc)
    return {"submitted": True}


@api_router.get("/predictions/history")
async def predictions_history(user: dict = Depends(get_current_user)):
    subs = await db.submissions.find({"user_id": user["id"]}, {"_id": 0}).sort("submitted_at", -1).to_list(1000)
    qids = list({s["question_id"] for s in subs})
    questions = {q["id"]: q for q in await db.questions.find({"id": {"$in": qids}}, {"_id": 0}).to_list(500)}
    fids = list({q["fixture_id"] for q in questions.values()})
    fixtures = {f["id"]: f for f in await db.fixtures.find({"id": {"$in": fids}}, {"_id": 0}).to_list(500)}
    total_points = sum(s.get("points_earned", 0) for s in subs)
    return {"total_points": total_points, "submissions": subs, "questions": questions, "fixtures": fixtures}


@api_router.get("/predictions/leaderboard")
async def predictions_leaderboard():
    pipe = [
        {"$group": {"_id": "$user_id", "points": {"$sum": "$points_earned"}, "submissions": {"$sum": 1}, "first_submitted": {"$min": "$submitted_at"}}},
        {"$sort": {"points": -1, "first_submitted": 1}},
        {"$limit": 10},
    ]
    rows = await db.submissions.aggregate(pipe).to_list(20)
    user_ids = [r["_id"] for r in rows]
    users = {u["id"]: u for u in await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "password_hash": 0}).to_list(50)}
    return [
        {
            "user_id": r["_id"],
            "name": users.get(r["_id"], {}).get("name", "Unknown"),
            "company": users.get(r["_id"], {}).get("company", ""),
            "points": r["points"],
            "submissions": r["submissions"],
            "first_submitted": r.get("first_submitted"),
        }
        for r in rows
    ]


# ---------- Announcements ----------
@api_router.get("/announcements")
async def list_announcements():
    return await db.announcements.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)


# ---------- Settings ----------
@api_router.get("/settings/tnc")
async def get_tnc():
    s = await db.settings.find_one({"id": "tnc"}, {"_id": 0})
    if not s:
        return {"content": ""}
    return {"content": s.get("content", "")}


# =========================================================
# ============= ADMIN ENDPOINTS ===========================
# =========================================================
@api_router.get("/admin/registrations")
async def admin_registrations(_: dict = Depends(require_admin)):
    regs = await db.ps5_registrations.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return regs


@api_router.patch("/admin/registrations/{reg_id}/payment")
async def admin_set_payment(reg_id: str, payload: dict, _: dict = Depends(require_admin)):
    status_val = payload.get("payment_status", "pending")
    if status_val not in ("pending", "confirmed"):
        raise HTTPException(status_code=400, detail="Invalid status")
    res = await db.ps5_registrations.update_one({"id": reg_id}, {"$set": {"payment_status": status_val}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Registration not found")
    return {"ok": True}


@api_router.patch("/admin/registrations/{reg_id}/group")
async def admin_set_group(reg_id: str, payload: dict, _: dict = Depends(require_admin)):
    group = (payload.get("group") or "").strip().upper() or None
    res = await db.ps5_registrations.update_one({"id": reg_id}, {"$set": {"group": group}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Registration not found")
    return {"ok": True, "group": group}


@api_router.post("/admin/groups/auto-assign")
async def admin_auto_assign_groups(payload: Optional[dict] = None, _: dict = Depends(require_admin)):
    """Shuffle registered players into groups — FIFA draw style — and auto-generate round-robin group fixtures."""
    payload = payload or {}
    group_size = max(2, int(payload.get("group_size", 4)))
    only_confirmed = bool(payload.get("only_confirmed", False))
    generate_fixtures = bool(payload.get("generate_fixtures", True))
    query = {"payment_status": "confirmed"} if only_confirmed else {}
    regs = await db.ps5_registrations.find(query, {"_id": 0}).to_list(2000)
    if not regs:
        raise HTTPException(status_code=400, detail="No registrations to assign")
    random.shuffle(regs)
    num_groups = math.ceil(len(regs) / group_size)
    letters = [chr(ord("A") + i) for i in range(num_groups)]
    grouped: dict[str, list] = {letter: [] for letter in letters}
    for i, reg in enumerate(regs):
        letter = letters[i % num_groups]
        grouped[letter].append(reg)
        await db.ps5_registrations.update_one({"id": reg["id"]}, {"$set": {"group": letter}})

    matches_created = 0
    if generate_fixtures:
        # Old group-stage matches belong to the previous draw — wipe and regenerate
        await db.ps5_matches.delete_many({"round_label": {"$regex": "^Group"}})
        pairs = []
        for letter in letters:
            for a, b in itertools.combinations(grouped[letter], 2):
                pairs.append((letter, a, b))
        base = (now_utc() + timedelta(days=1)).replace(hour=13, minute=30, second=0, microsecond=0)  # tomorrow 7PM IST
        slots_per_day = 4
        for idx, (letter, a, b) in enumerate(pairs):
            scheduled = base + timedelta(days=idx // slots_per_day, minutes=(idx % slots_per_day) * 45)
            await db.ps5_matches.insert_one({
                "id": str(uuid.uuid4()),
                "round_label": f"Group {letter}",
                "player_a": a["player_name"], "player_a_company": a.get("company_name", ""),
                "player_b": b["player_name"], "player_b_company": b.get("company_name", ""),
                "station": f"Station {(idx % 2) + 1}",
                "scheduled_at": scheduled.isoformat(),
                "score_a": 0, "score_b": 0, "status": "upcoming",
                "winner": None, "player_of_match": None,
                "created_at": now_utc().isoformat(),
            })
            matches_created += 1
    return {"ok": True, "groups": num_groups, "players": len(regs), "matches_created": matches_created}


@api_router.get("/admin/registrations/export")
async def admin_registrations_export(_: dict = Depends(require_admin)):
    regs = await db.ps5_registrations.find({}, {"_id": 0}).to_list(2000)
    df = pd.DataFrame(regs)
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Registrations')
    buf.seek(0)
    filename = f"ps5_registrations_{now_utc().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return StreamingResponse(buf, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                             headers={"Content-Disposition": f"attachment; filename={filename}"})


@api_router.post("/admin/matches")
async def admin_create_match(data: MatchIn, _: dict = Depends(require_admin)):
    match = {
        "id": str(uuid.uuid4()),
        **data.model_dump(),
        "score_a": 0,
        "score_b": 0,
        "status": "upcoming",
        "winner": None,
        "player_of_match": None,
        "created_at": now_utc().isoformat(),
    }
    await db.ps5_matches.insert_one(match)
    return strip_id(match)


@api_router.patch("/admin/matches/{match_id}/score")
async def admin_update_score(match_id: str, data: MatchScoreIn, _: dict = Depends(require_admin)):
    match = await db.ps5_matches.find_one({"id": match_id})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    winner = None
    if data.status == "completed":
        if data.score_a > data.score_b:
            winner = match["player_a"]
        elif data.score_b > data.score_a:
            winner = match["player_b"]
        else:
            winner = "Draw"
    update = {
        "score_a": data.score_a, "score_b": data.score_b, "status": data.status,
        "winner": winner, "player_of_match": data.player_of_match,
    }
    await db.ps5_matches.update_one({"id": match_id}, {"$set": update})
    return {"ok": True}


@api_router.delete("/admin/matches/{match_id}")
async def admin_delete_match(match_id: str, _: dict = Depends(require_admin)):
    await db.ps5_matches.delete_one({"id": match_id})
    return {"ok": True}


@api_router.post("/admin/fixtures")
async def admin_create_fixture(data: FixtureIn, _: dict = Depends(require_admin)):
    f = {"id": str(uuid.uuid4()), **data.model_dump(), "created_at": now_utc().isoformat()}
    await db.fixtures.insert_one(f)
    return strip_id(f)


@api_router.delete("/admin/fixtures/{fid}")
async def admin_delete_fixture(fid: str, _: dict = Depends(require_admin)):
    await db.fixtures.delete_one({"id": fid})
    await db.questions.delete_many({"fixture_id": fid})
    return {"ok": True}


@api_router.post("/admin/questions")
async def admin_create_question(data: QuestionIn, _: dict = Depends(require_admin)):
    q = {"id": str(uuid.uuid4()), **data.model_dump(), "correct_answer": None, "results_entered": False, "created_at": now_utc().isoformat()}
    await db.questions.insert_one(q)
    return strip_id(q)


@api_router.get("/admin/questions")
async def admin_list_questions(_: dict = Depends(require_admin)):
    qs = await db.questions.find({}, {"_id": 0}).sort("date", -1).to_list(500)
    return qs


@api_router.delete("/admin/questions/{qid}")
async def admin_delete_question(qid: str, _: dict = Depends(require_admin)):
    await db.questions.delete_one({"id": qid})
    await db.submissions.delete_many({"question_id": qid})
    return {"ok": True}


@api_router.patch("/admin/questions/{qid}/result")
async def admin_enter_result(qid: str, data: QuestionResultIn, _: dict = Depends(require_admin)):
    q = await db.questions.find_one({"id": qid})
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    correct = data.correct_answer
    points_per = q.get("points", 10)
    # Score every submission
    subs = await db.submissions.find({"question_id": qid}).to_list(5000)
    for s in subs:
        earned = 0
        ans = s.get("answer")
        if q["type"] == "numeric_score":
            # answer/correct: {"a": int, "b": int}. 10 pts outcome, +15 exact (configurable).
            try:
                ca, cb = int(correct.get("a")), int(correct.get("b"))
                ua, ub = int(ans.get("a")), int(ans.get("b"))
                # outcome correct?
                if (ca > cb and ua > ub) or (ca < cb and ua < ub) or (ca == cb and ua == ub):
                    earned += 10
                if ca == ua and cb == ub:
                    earned += 15  # exact bonus
            except Exception:
                earned = 0
        elif q["type"] == "multi_select":
            try:
                correct_set = set(correct or [])
                user_set = set(ans or [])
                earned = 5 * len(correct_set & user_set)
            except Exception:
                earned = 0
        else:  # dropdown, radio
            if ans is not None and str(ans).strip().lower() == str(correct).strip().lower():
                earned = points_per
        await db.submissions.update_one({"_id": s["_id"]}, {"$set": {"points_earned": earned}})
    await db.questions.update_one({"id": qid}, {"$set": {"correct_answer": correct, "results_entered": True}})
    return {"ok": True, "scored": len(subs)}


@api_router.post("/admin/announcements")
async def admin_create_announcement(data: AnnouncementIn, background_tasks: BackgroundTasks, _: dict = Depends(require_admin)):
    a = {"id": str(uuid.uuid4()), "title": data.title, "body": data.body, "created_at": now_utc().isoformat()}
    await db.announcements.insert_one(a)
    background_tasks.add_task(broadcast_push, data.title, data.body, "/")
    return strip_id(a)


# ============= WEB PUSH NOTIFICATIONS ===========================
VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY")
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY")
VAPID_SUBJECT = os.environ.get("VAPID_SUBJECT", "mailto:hr@mav-s.com")


async def broadcast_push(title: str, body: str, url: str = "/"):
    """Send a web push notification to every stored subscription. Prunes dead ones (404/410)."""
    if not (VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY):
        logger.warning("VAPID keys missing — push broadcast skipped")
        return
    subs = await db.push_subscriptions.find({}, {"_id": 0}).to_list(5000)
    payload = json.dumps({"title": title, "body": body, "url": url})
    sent = pruned = 0
    for s in subs:
        def _send(sub=s):
            webpush(
                subscription_info={"endpoint": sub["endpoint"], "keys": sub["keys"]},
                data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={"sub": VAPID_SUBJECT},
            )
        try:
            await asyncio.to_thread(_send)
            sent += 1
        except WebPushException as ex:
            sc = getattr(getattr(ex, "response", None), "status_code", None)
            if sc in (404, 410):
                await db.push_subscriptions.delete_one({"endpoint": s["endpoint"]})
                pruned += 1
            else:
                logger.warning(f"Push failed ({sc}): {ex}")
        except Exception as e:
            logger.warning(f"Push failed: {e}")
    logger.info(f"Push broadcast '{title}': sent={sent}, pruned={pruned}, total={len(subs)}")


@api_router.get("/push/vapid-public-key")
async def vapid_public_key():
    return {"publicKey": VAPID_PUBLIC_KEY}


@api_router.post("/push/subscribe")
async def push_subscribe(payload: dict):
    sub = payload.get("subscription") or payload
    endpoint = sub.get("endpoint")
    keys = sub.get("keys") or {}
    if not endpoint or not keys.get("p256dh") or not keys.get("auth"):
        raise HTTPException(status_code=400, detail="Invalid push subscription")
    await db.push_subscriptions.update_one(
        {"endpoint": endpoint},
        {
            "$set": {"endpoint": endpoint, "keys": {"p256dh": keys["p256dh"], "auth": keys["auth"]}, "updated_at": now_utc().isoformat()},
            "$setOnInsert": {"id": str(uuid.uuid4()), "created_at": now_utc().isoformat()},
        },
        upsert=True,
    )
    return {"ok": True}


@api_router.post("/push/unsubscribe")
async def push_unsubscribe(payload: dict):
    endpoint = payload.get("endpoint")
    if endpoint:
        await db.push_subscriptions.delete_many({"endpoint": endpoint})
    return {"ok": True}


@api_router.delete("/admin/announcements/{aid}")
async def admin_delete_announcement(aid: str, _: dict = Depends(require_admin)):
    await db.announcements.delete_one({"id": aid})
    return {"ok": True}


@api_router.put("/admin/settings/tnc")
async def admin_update_tnc(payload: dict, _: dict = Depends(require_admin)):
    content = payload.get("content", "")
    await db.settings.update_one({"id": "tnc"}, {"$set": {"id": "tnc", "content": content}}, upsert=True)
    return {"ok": True}


@api_router.get("/admin/dashboard-stats")
async def admin_stats(_: dict = Depends(require_admin)):
    return {
        "registrations": await db.ps5_registrations.count_documents({}),
        "payments_pending": await db.ps5_registrations.count_documents({"payment_status": "pending"}),
        "payments_confirmed": await db.ps5_registrations.count_documents({"payment_status": "confirmed"}),
        "matches": await db.ps5_matches.count_documents({}),
        "matches_live": await db.ps5_matches.count_documents({"status": "live"}),
        "matches_completed": await db.ps5_matches.count_documents({"status": "completed"}),
        "questions": await db.questions.count_documents({}),
        "users": await db.users.count_documents({"role": "user"}),
        "predictions": await db.submissions.count_documents({}),
    }


# ---------- Seed Function ----------
DEFAULT_TNC = """\
**TechnoKick 2026 — PS5 FIFA Tournament Terms & Conditions**

1. **Format**: Individual (1v1) tournament played FIFA World Cup style. Players are drawn into groups by the committee. Round-robin within your group — top players advance to the knockout stage.
2. **Eligibility**: Open to all employees of Technopark campus member companies.
3. **Entry Fee**: ₹100 per player. Pay at the committee desk; confirmation reflects in your dashboard.
4. **Group Draw**: Groups are assigned by the committee after registrations close — just like the World Cup draw. Check your group on your dashboard.
5. **Timing**: Matches start daily from 7:00 PM IST onwards on assigned stations.
6. **Match Conduct**: 6 minutes per half on PS5 EA Sports FC. Standard rules. No custom tactics carried across matches.
7. **Code of Conduct**: Be respectful. Trash talk in good fun only. Cheating = disqualification.
8. **No-show**: 5-minute grace, then walkover (3-0 default) awarded to opponent.
9. **Withdrawal**: Allowed until the group draw is published. Post draw, contact the committee.
10. **Help Desk**: For anything related to the games — payments, scheduling, disputes — contact the committee (HR, MAV-S Innovations) at hr@mav-s.com.
"""


async def seed_database():
    # Indexes
    await db.users.create_index("phone", unique=True, sparse=True)
    await db.users.create_index("email", unique=True, sparse=True)
    await db.ps5_registrations.create_index("user_id")
    await db.ps5_matches.create_index("scheduled_at")
    await db.questions.create_index("date")
    await db.submissions.create_index([("user_id", 1), ("question_id", 1)], unique=True)

    # Admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@technokick.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email, "role": "admin"})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "name": "TechnoKick Admin",
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "role": "admin",
            "created_at": now_utc().isoformat(),
        })
        logger.info(f"Seeded admin: {admin_email}")
    else:
        # Update password if changed
        if not verify_password(admin_password, existing.get("password_hash", "")):
            await db.users.update_one({"id": existing["id"]}, {"$set": {"password_hash": hash_password(admin_password)}})
            logger.info("Updated admin password")

    # T&C
    tnc = await db.settings.find_one({"id": "tnc"})
    if not tnc or not (tnc.get("content") or "").strip():
        await db.settings.update_one({"id": "tnc"}, {"$set": {"id": "tnc", "content": DEFAULT_TNC}}, upsert=True)

    # Migrate: wipe old team-based seed data (schema changed to individual players)
    if await db.ps5_registrations.find_one({"team_name": {"$exists": True}}):
        await db.ps5_registrations.delete_many({})
    if await db.ps5_matches.find_one({"team_a": {"$exists": True}}):
        await db.ps5_matches.delete_many({})
    tnc_doc = await db.settings.find_one({"id": "tnc"})
    if tnc_doc and "team pools" in tnc_doc.get("content", ""):
        await db.settings.update_one({"id": "tnc"}, {"$set": {"content": DEFAULT_TNC}})

    logger.info("✅ Seed complete")


# ---------- Health ----------
@api_router.get("/")
async def root():
    return {"app": "TechnoKick 2026", "status": "live"}


# Register
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    try:
        await seed_database()
    except Exception as e:
        logger.error(f"Seed failed: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
