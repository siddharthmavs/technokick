"""
TechnoKick 2026 — Backend regression tests.
Covers: auth (user phone+name auto-create, admin email+password), PS5 flow,
points table & groups, predictions, leaderboard, announcements, settings,
admin endpoints (registrations, payment, group, matches, fixtures, questions,
result declaration & scoring), auth guards.
"""
import os
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@technokick.com"
ADMIN_PASSWORD = "admin123"


# ------------- Fixtures -------------
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(session):
    r = session.post(f"{API}/auth/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="session")
def user_creds():
    # unique phone per run to avoid cross-test pollution on registration
    return {"phone": f"77{uuid.uuid4().int % 10**8:08d}", "name": "TEST Player", "company": "TestCorp"}


@pytest.fixture(scope="session")
def user_token(session, user_creds):
    r = session.post(f"{API}/auth/user/login", json=user_creds)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def user_headers(user_token):
    return {"Authorization": f"Bearer {user_token}"}


# ------------- Health -------------
class TestHealth:
    def test_root(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200
        assert r.json().get("status") == "live"


# ------------- Auth -------------
class TestAuth:
    def test_user_login_auto_creates(self, session):
        phone = f"88{uuid.uuid4().int % 10**8:08d}"
        r = session.post(f"{API}/auth/user/login", json={"phone": phone, "name": "Auto Created"})
        assert r.status_code == 200
        body = r.json()
        assert "token" in body and body["user"]["phone"] == phone
        assert body["user"]["role"] == "user"
        assert body["user"]["name"] == "Auto Created"

    def test_user_login_returns_same_user_on_relogin(self, session):
        phone = f"88{uuid.uuid4().int % 10**8:08d}"
        r1 = session.post(f"{API}/auth/user/login", json={"phone": phone, "name": "Repeat"})
        r2 = session.post(f"{API}/auth/user/login", json={"phone": phone, "name": "Repeat"})
        assert r1.json()["user"]["id"] == r2.json()["user"]["id"]

    def test_user_login_missing_phone(self, session):
        r = session.post(f"{API}/auth/user/login", json={"phone": "", "name": "X"})
        assert r.status_code == 400

    def test_admin_login_success(self, session):
        r = session.post(f"{API}/auth/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "admin"

    def test_admin_login_bad_password(self, session):
        r = session.post(f"{API}/auth/admin/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_auth_me_user(self, session, user_headers):
        r = session.get(f"{API}/auth/me", headers=user_headers)
        assert r.status_code == 200
        assert r.json()["role"] == "user"

    def test_auth_me_no_token(self, session):
        r = session.get(f"{API}/auth/me")
        assert r.status_code == 401


# ------------- Auth guards -------------
class TestAuthGuards:
    def test_admin_endpoint_without_token(self, session):
        r = session.get(f"{API}/admin/registrations")
        assert r.status_code == 401

    def test_admin_endpoint_with_user_token(self, session, user_headers):
        r = session.get(f"{API}/admin/registrations", headers=user_headers)
        assert r.status_code == 403

    def test_admin_endpoint_with_admin_token(self, session, admin_headers):
        r = session.get(f"{API}/admin/registrations", headers=admin_headers)
        assert r.status_code == 200


# ------------- Public reads -------------
class TestPublicReads:
    def test_list_matches(self, session):
        r = session.get(f"{API}/ps5/matches")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_points_table_structure(self, session):
        r = session.get(f"{API}/ps5/points-table")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        if data:
            entry = data[0]
            assert "group" in entry and "rows" in entry
            if entry["rows"]:
                row = entry["rows"][0]
                for k in ("player", "company", "played", "won", "drawn", "lost", "gf", "ga", "gd", "points"):
                    assert k in row, f"missing {k} in points-table row"

    def test_groups_shape(self, session):
        r = session.get(f"{API}/ps5/groups")
        assert r.status_code == 200
        body = r.json()
        assert "groups" in body and "unassigned" in body
        assert isinstance(body["groups"], list)

    def test_fixtures(self, session):
        r = session.get(f"{API}/fixtures")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_announcements(self, session):
        r = session.get(f"{API}/announcements")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_tnc_get(self, session):
        r = session.get(f"{API}/settings/tnc")
        assert r.status_code == 200
        assert "content" in r.json()


# ------------- PS5 Registration CRUD -------------
class TestPS5Registration:
    def test_create_get_update_delete(self, session, user_headers):
        # cleanup
        session.delete(f"{API}/ps5/registrations/mine", headers=user_headers)
        payload = {"player_name": "TEST Player", "company_name": "TestCorp", "contact": "9999000111"}
        r = session.post(f"{API}/ps5/registrations", headers=user_headers, json=payload)
        assert r.status_code == 200, r.text
        reg = r.json()
        assert reg["payment_status"] == "pending"
        assert reg["player_name"] == "TEST Player"
        assert reg["group"] is None

        # Get mine
        r = session.get(f"{API}/ps5/registrations/mine", headers=user_headers)
        assert r.status_code == 200
        assert r.json()["id"] == reg["id"]

        # Duplicate create rejected
        r = session.post(f"{API}/ps5/registrations", headers=user_headers, json=payload)
        assert r.status_code == 400

        # Update
        upd = {"player_name": "TEST Updated", "company_name": "TestCorp2", "contact": "9999000222"}
        r = session.put(f"{API}/ps5/registrations/mine", headers=user_headers, json=upd)
        assert r.status_code == 200
        assert r.json()["player_name"] == "TEST Updated"

        # Verify persisted
        r = session.get(f"{API}/ps5/registrations/mine", headers=user_headers)
        assert r.json()["player_name"] == "TEST Updated"

        # Delete
        r = session.delete(f"{API}/ps5/registrations/mine", headers=user_headers)
        assert r.status_code == 200
        r = session.get(f"{API}/ps5/registrations/mine", headers=user_headers)
        assert r.status_code == 200 and r.json() is None


# ------------- Predictions -------------
class TestPredictions:
    def test_predictions_today_requires_auth(self, session):
        r = session.get(f"{API}/predictions/today")
        assert r.status_code == 401

    def test_predictions_today_shape(self, session, user_headers):
        r = session.get(f"{API}/predictions/today", headers=user_headers)
        assert r.status_code == 200
        body = r.json()
        assert {"date", "questions", "fixtures", "submissions"} <= set(body.keys())

    def test_submit_persists(self, session, user_headers):
        today = session.get(f"{API}/predictions/today", headers=user_headers).json()
        if not today["questions"]:
            pytest.skip("No questions seeded for today")
        qs = today["questions"]
        answers = []
        for q in qs:
            if q["type"] == "dropdown" or q["type"] == "radio":
                answers.append({"question_id": q["id"], "answer": q["options"][0]})
            elif q["type"] == "numeric_score":
                answers.append({"question_id": q["id"], "answer": {"a": 2, "b": 1}})
            elif q["type"] == "multi_select":
                answers.append({"question_id": q["id"], "answer": q["options"][:1]})
        r = session.post(f"{API}/predictions/submit", headers=user_headers, json={"answers": answers})
        assert r.status_code == 200
        assert r.json()["submitted"] is True

        # Persistence check
        r2 = session.get(f"{API}/predictions/today", headers=user_headers).json()
        assert len(r2["submissions"]) >= len(qs), "submissions not persisted"

    def test_history(self, session, user_headers):
        r = session.get(f"{API}/predictions/history", headers=user_headers)
        assert r.status_code == 200
        body = r.json()
        assert "total_points" in body and "submissions" in body

    def test_leaderboard_public(self, session):
        r = session.get(f"{API}/predictions/leaderboard")
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ------------- Admin: registrations management -------------
class TestAdminRegistrations:
    def test_payment_and_group(self, session, admin_headers, user_headers):
        # Make sure user has a registration
        session.delete(f"{API}/ps5/registrations/mine", headers=user_headers)
        session.post(f"{API}/ps5/registrations", headers=user_headers,
                     json={"player_name": "TEST RegMgr", "company_name": "TC", "contact": "9999000333"})
        regs = session.get(f"{API}/admin/registrations", headers=admin_headers).json()
        mine = next((x for x in regs if x["player_name"] == "TEST RegMgr"), None)
        assert mine is not None
        rid = mine["id"]

        # Confirm payment
        r = session.patch(f"{API}/admin/registrations/{rid}/payment", headers=admin_headers,
                          json={"payment_status": "confirmed"})
        assert r.status_code == 200
        regs2 = session.get(f"{API}/admin/registrations", headers=admin_headers).json()
        m2 = next(x for x in regs2 if x["id"] == rid)
        assert m2["payment_status"] == "confirmed"

        # Invalid status
        r = session.patch(f"{API}/admin/registrations/{rid}/payment", headers=admin_headers,
                          json={"payment_status": "xxx"})
        assert r.status_code == 400

        # Assign group
        r = session.patch(f"{API}/admin/registrations/{rid}/group", headers=admin_headers,
                          json={"group": "C"})
        assert r.status_code == 200
        assert r.json()["group"] == "C"

        # cleanup
        session.delete(f"{API}/ps5/registrations/mine", headers=user_headers)

    def test_export_excel(self, session, admin_headers):
        r = session.get(f"{API}/admin/registrations/export", headers=admin_headers)
        assert r.status_code == 200
        assert "spreadsheetml" in r.headers.get("content-type", "")
        assert len(r.content) > 100

    def test_dashboard_stats(self, session, admin_headers):
        r = session.get(f"{API}/admin/dashboard-stats", headers=admin_headers)
        assert r.status_code == 200
        body = r.json()
        for k in ("registrations", "matches", "users", "predictions", "questions"):
            assert k in body


# ------------- Admin: matches / fixtures / questions -------------
class TestAdminMatchesFixturesQuestions:
    def test_match_lifecycle(self, session, admin_headers):
        payload = {
            "player_a": "TEST_PA", "player_a_company": "C1",
            "player_b": "TEST_PB", "player_b_company": "C2",
            "scheduled_at": "2026-06-15T13:30:00Z", "station": "Station X",
            "round_label": "Group A",
        }
        r = session.post(f"{API}/admin/matches", headers=admin_headers, json=payload)
        assert r.status_code == 200, r.text
        mid = r.json()["id"]

        # Update score -> completed
        r = session.patch(f"{API}/admin/matches/{mid}/score", headers=admin_headers,
                          json={"score_a": 3, "score_b": 1, "status": "completed"})
        assert r.status_code == 200

        listed = session.get(f"{API}/ps5/matches").json()
        found = next((x for x in listed if x["id"] == mid), None)
        assert found and found["winner"] == "TEST_PA" and found["status"] == "completed"

        # Delete
        r = session.delete(f"{API}/admin/matches/{mid}", headers=admin_headers)
        assert r.status_code == 200

    def test_fixture_lifecycle(self, session, admin_headers):
        payload = {
            "team_a": "TEST_TA", "team_a_flag": "🏳", "team_b": "TEST_TB",
            "team_b_flag": "🏳", "kickoff_at": "2026-06-15T19:00:00Z",
            "venue": "Test Stadium", "stage": "Group Z",
        }
        r = session.post(f"{API}/admin/fixtures", headers=admin_headers, json=payload)
        assert r.status_code == 200
        fid = r.json()["id"]
        r = session.delete(f"{API}/admin/fixtures/{fid}", headers=admin_headers)
        assert r.status_code == 200

    def test_question_create_submit_declare_scoring(self, session, admin_headers, user_headers):
        # Create fixture first
        f = session.post(f"{API}/admin/fixtures", headers=admin_headers, json={
            "team_a": "TEST_X", "team_a_flag": "🏳", "team_b": "TEST_Y",
            "team_b_flag": "🏳", "kickoff_at": "2026-06-15T19:00:00Z",
            "venue": "T", "stage": "G",
        }).json()

        today = requests.get(f"{API}/predictions/today", headers=user_headers).json()["date"]
        q_payload = {
            "date": today, "fixture_id": f["id"],
            "text": "TEST Who will win?", "type": "dropdown",
            "options": ["TEST_X", "Draw", "TEST_Y"], "points": 10, "order": 99,
        }
        q = session.post(f"{API}/admin/questions", headers=admin_headers, json=q_payload).json()

        # User submits correct answer
        r = session.post(f"{API}/predictions/submit", headers=user_headers,
                         json={"answers": [{"question_id": q["id"], "answer": "TEST_X"}]})
        assert r.status_code == 200

        # Declare result
        r = session.patch(f"{API}/admin/questions/{q['id']}/result", headers=admin_headers,
                          json={"correct_answer": "TEST_X"})
        assert r.status_code == 200
        body = r.json()
        assert body["scored"] >= 1

        # History should reflect points
        hist = session.get(f"{API}/predictions/history", headers=user_headers).json()
        earned = sum(s.get("points_earned", 0) for s in hist["submissions"] if s["question_id"] == q["id"])
        assert earned == 10

        # Leaderboard should now contain a non-empty entry
        lb = session.get(f"{API}/predictions/leaderboard").json()
        assert any(row["points"] >= 10 for row in lb)

        # Cleanup
        session.delete(f"{API}/admin/questions/{q['id']}", headers=admin_headers)
        session.delete(f"{API}/admin/fixtures/{f['id']}", headers=admin_headers)


# ------------- Admin: announcements & settings -------------
class TestAdminAnnouncementsSettings:
    def test_announcement_lifecycle(self, session, admin_headers):
        r = session.post(f"{API}/admin/announcements", headers=admin_headers,
                         json={"title": "TEST Title", "body": "TEST body"})
        assert r.status_code == 200
        aid = r.json()["id"]
        public = session.get(f"{API}/announcements").json()
        assert any(a["id"] == aid for a in public)
        r = session.delete(f"{API}/admin/announcements/{aid}", headers=admin_headers)
        assert r.status_code == 200

    def test_tnc_update_persists(self, session, admin_headers):
        original = session.get(f"{API}/settings/tnc").json()["content"]
        marker = "TEST_TNC_" + uuid.uuid4().hex[:8]
        r = session.put(f"{API}/admin/settings/tnc", headers=admin_headers,
                        json={"content": original + "\n" + marker})
        assert r.status_code == 200
        fetched = session.get(f"{API}/settings/tnc").json()["content"]
        assert marker in fetched
        # Restore
        session.put(f"{API}/admin/settings/tnc", headers=admin_headers, json={"content": original})


# ------------- Admin: auto-assign groups -------------
class TestAutoAssign:
    def test_auto_assign_requires_admin(self, session, user_headers):
        r = session.post(f"{API}/admin/groups/auto-assign", headers=user_headers, json={"group_size": 4})
        assert r.status_code == 403

    def test_auto_assign_runs(self, session, admin_headers):
        r = session.post(f"{API}/admin/groups/auto-assign", headers=admin_headers, json={"group_size": 4})
        assert r.status_code == 200
        body = r.json()
        assert body["ok"] is True
        assert body["players"] >= 1
        # Verify all registered players got a group letter
        regs = session.get(f"{API}/admin/registrations", headers=admin_headers).json()
        assert all(r.get("group") for r in regs)
