from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, WebSocket, WebSocketDisconnect, Body
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import os, logging, uuid, bcrypt, jwt, json, random, asyncio, secrets

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
)

# Setup
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ========================
# MODELS
# ========================
class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    referral_code: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class WithdrawRequest(BaseModel):
    amount: float
    method: str = "upi"
    upi_id: Optional[str] = None

class BetRequest(BaseModel):
    round_id: str
    bet_type: str
    bet_value: str
    amount: float

class GamePlayRequest(BaseModel):
    bet_type: str
    bet_value: str
    amount: float

class AviatorBetRequest(BaseModel):
    amount: float

class AviatorCashoutRequest(BaseModel):
    bet_id: str

class DepositRequest(BaseModel):
    package_id: str
    origin_url: str

class AdminBalanceRequest(BaseModel):
    amount: float
    reason: str = ""

# ========================
# AUTH HELPERS
# ========================
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def get_jwt_secret():
    return os.environ["JWT_SECRET"]

def create_access_token(user_id: str, email: str) -> str:
    return jwt.encode(
        {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(minutes=60), "type": "access"},
        get_jwt_secret(), algorithm=JWT_ALGORITHM
    )

def create_refresh_token(user_id: str) -> str:
    return jwt.encode(
        {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"},
        get_jwt_secret(), algorithm=JWT_ALGORITHM
    )

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

def set_auth_cookies(response: Response, user_id: str, email: str):
    access = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    response.set_cookie("access_token", access, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    return access, refresh

def safe_user(user: dict) -> dict:
    uid = str(user.get("_id", user.get("id", "")))
    return {k: v for k, v in user.items() if k not in ("password_hash", "_id")} | {"id": uid}

# ========================
# AUTH ENDPOINTS
# ========================
@api.post("/auth/register")
async def register(req: RegisterRequest, response: Response):
    email = req.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    ref_code = secrets.token_hex(4).upper()
    user_doc = {
        "email": email, "password_hash": hash_password(req.password), "name": req.name,
        "role": "player", "balance": 100.0, "total_deposited": 0.0, "total_wagered": 0.0,
        "total_won": 0.0, "vip_tier": "bronze", "rank": "normal", "referral_code": ref_code,
        "referred_by": req.referral_code, "is_banned": False, "kyc_verified": False,
        "login_streak": 0, "last_login": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    if req.referral_code:
        referrer = await db.users.find_one({"referral_code": req.referral_code})
        if referrer:
            await db.users.update_one({"_id": referrer["_id"]}, {"$inc": {"balance": 50.0}})
            await db.users.update_one({"_id": result.inserted_id}, {"$inc": {"balance": 50.0}})
    access, _ = set_auth_cookies(response, user_id, email)
    user_doc["_id"] = user_id
    return {"user": safe_user(user_doc), "access_token": access}

@api.post("/auth/login")
async def login(req: LoginRequest, request: Request, response: Response):
    email = req.email.lower().strip()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    attempts = await db.login_attempts.find_one({"identifier": identifier})
    if attempts and attempts.get("count", 0) >= 5:
        last = datetime.fromisoformat(attempts["last_attempt"])
        if datetime.now(timezone.utc) - last < timedelta(minutes=15):
            raise HTTPException(status_code=429, detail="Too many attempts. Try again in 15 minutes.")
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"count": 1}, "$set": {"last_attempt": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user.get("is_banned"):
        raise HTTPException(status_code=403, detail="Account is banned")
    await db.login_attempts.delete_one({"identifier": identifier})
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}, "$inc": {"login_streak": 1}}
    )
    user_id = str(user["_id"])
    access, _ = set_auth_cookies(response, user_id, email)
    user["_id"] = user_id
    return {"user": safe_user(user), "access_token": access}

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}

@api.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return {"user": user}

@api.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        set_auth_cookies(response, str(user["_id"]), user["email"])
        return {"message": "Token refreshed"}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ========================
# WALLET ENDPOINTS
# ========================
@api.get("/wallet/balance")
async def get_balance(request: Request):
    user = await get_current_user(request)
    fresh = await db.users.find_one({"_id": ObjectId(user["_id"])})
    return {"balance": fresh.get("balance", 0)}

@api.get("/wallet/transactions")
async def get_transactions(request: Request, limit: int = 50, skip: int = 0):
    user = await get_current_user(request)
    txns = await db.wallet_transactions.find(
        {"user_id": user["_id"]}, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"transactions": txns}

@api.post("/wallet/withdraw")
async def withdraw(req: WithdrawRequest, request: Request):
    user = await get_current_user(request)
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid amount")
    fresh = await db.users.find_one({"_id": ObjectId(user["_id"])})
    if req.amount > fresh.get("balance", 0):
        raise HTTPException(status_code=400, detail="Insufficient balance")
    txn = {
        "id": str(uuid.uuid4()), "user_id": user["_id"], "type": "withdrawal",
        "amount": req.amount, "method": req.method, "upi_id": req.upi_id,
        "status": "pending", "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.wallet_transactions.insert_one(txn)
    await db.users.update_one({"_id": ObjectId(user["_id"])}, {"$inc": {"balance": -req.amount}})
    txn.pop("_id", None)
    return {"message": "Withdrawal requested", "transaction": txn}

# ========================
# STRIPE PAYMENT ENDPOINTS
# ========================
DEPOSIT_PACKAGES = {"100": 100.00, "500": 500.00, "1000": 1000.00, "2000": 2000.00, "5000": 5000.00}

@api.get("/payments/packages")
async def get_packages():
    return {"packages": [{"id": k, "amount": v, "currency": "INR"} for k, v in DEPOSIT_PACKAGES.items()]}

@api.post("/payments/create-checkout")
async def create_checkout(req: DepositRequest, request: Request):
    user = await get_current_user(request)
    if req.package_id not in DEPOSIT_PACKAGES:
        raise HTTPException(status_code=400, detail="Invalid package")
    amount = DEPOSIT_PACKAGES[req.package_id]
    origin = req.origin_url.rstrip("/")
    success_url = f"{origin}/wallet?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/wallet"
    api_key = os.environ.get("STRIPE_API_KEY")
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    checkout_req = CheckoutSessionRequest(
        amount=float(amount), currency="inr", success_url=success_url, cancel_url=cancel_url,
        metadata={"user_id": user["_id"], "package_id": req.package_id}
    )
    session = await stripe.create_checkout_session(checkout_req)
    txn = {
        "id": str(uuid.uuid4()), "session_id": session.session_id, "user_id": user["_id"],
        "type": "deposit", "amount": amount, "currency": "inr", "status": "initiated",
        "payment_status": "pending", "metadata": {"package_id": req.package_id},
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_transactions.insert_one(txn)
    return {"url": session.url, "session_id": session.session_id}

@api.get("/payments/status/{session_id}")
async def payment_status(session_id: str, request: Request):
    user = await get_current_user(request)
    txn = await db.payment_transactions.find_one({"session_id": session_id, "user_id": user["_id"]})
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if txn.get("payment_status") == "paid":
        return {"status": "complete", "payment_status": "paid", "amount": txn["amount"]}
    api_key = os.environ.get("STRIPE_API_KEY")
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    try:
        status = await stripe.get_checkout_status(session_id)
        if status.payment_status == "paid" and txn.get("payment_status") != "paid":
            await db.users.update_one(
                {"_id": ObjectId(user["_id"])},
                {"$inc": {"balance": txn["amount"], "total_deposited": txn["amount"]}}
            )
            await db.payment_transactions.update_one(
                {"session_id": session_id}, {"$set": {"status": "complete", "payment_status": "paid"}}
            )
            await db.wallet_transactions.insert_one({
                "id": str(uuid.uuid4()), "user_id": user["_id"], "type": "deposit",
                "amount": txn["amount"], "status": "completed",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        elif status.status == "expired":
            await db.payment_transactions.update_one(
                {"session_id": session_id}, {"$set": {"status": "expired", "payment_status": "expired"}}
            )
        return {"status": status.status, "payment_status": status.payment_status, "amount": txn["amount"]}
    except Exception as e:
        logger.error(f"Payment status check error: {e}")
        return {"status": txn.get("status", "unknown"), "payment_status": txn.get("payment_status", "pending"), "amount": txn["amount"]}

@app.post("/api/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("Stripe-Signature")
    api_key = os.environ.get("STRIPE_API_KEY")
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    try:
        wr = await stripe.handle_webhook(body, sig)
        if wr.payment_status == "paid":
            txn = await db.payment_transactions.find_one({"session_id": wr.session_id})
            if txn and txn.get("payment_status") != "paid":
                await db.users.update_one(
                    {"_id": ObjectId(txn["user_id"])},
                    {"$inc": {"balance": txn["amount"], "total_deposited": txn["amount"]}}
                )
                await db.payment_transactions.update_one(
                    {"session_id": wr.session_id}, {"$set": {"status": "complete", "payment_status": "paid"}}
                )
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error"}

# ========================
# GAME LOGIC HELPERS
# ========================
def generate_wingo_result():
    price = random.randint(10000, 99999)
    last = price % 10
    if last == 0:
        color = "red_violet"
    elif last == 5:
        color = "green_violet"
    elif last in [1, 3, 7, 9]:
        color = "green"
    else:
        color = "red"
    return {"price": price, "number": last, "color": color}

def calc_wingo_winnings(bet, result):
    bt, bv, amt = bet["bet_type"], bet["bet_value"], bet["amount"]
    fee = 0.02
    if bt == "color":
        if bv == result["color"]:
            return amt * 2 * (1 - fee)
        if bv == "red" and "red" in result["color"]:
            return amt * 1.5 * (1 - fee)
        if bv == "green" and "green" in result["color"]:
            return amt * 1.5 * (1 - fee)
        if bv == "violet" and "violet" in result["color"]:
            return amt * 4.5 * (1 - fee)
    elif bt == "number":
        if str(result["number"]) == str(bv):
            return amt * 9 * (1 - fee)
    return 0

def generate_crash_point():
    e = 2 ** 32
    h = random.randint(0, e - 1)
    if h % 33 == 0:
        return 1.0
    return max(1.0, round((100 * e - h) / (e - h) / 100, 2))

def deal_andar_bahar():
    suits = ["hearts", "diamonds", "clubs", "spades"]
    deck = [(v, s) for s in suits for v in range(1, 14)]
    random.shuffle(deck)
    joker = deck.pop()
    andar, bahar, winner, turn = [], [], None, "andar"
    for card in deck:
        if turn == "andar":
            andar.append(card)
            if card[0] == joker[0]:
                winner = "andar"
                break
            turn = "bahar"
        else:
            bahar.append(card)
            if card[0] == joker[0]:
                winner = "bahar"
                break
            turn = "andar"
    return {
        "joker": {"value": joker[0], "suit": joker[1]},
        "andar_cards": [{"value": c[0], "suit": c[1]} for c in andar],
        "bahar_cards": [{"value": c[0], "suit": c[1]} for c in bahar],
        "winner": winner or "tie"
    }

def deal_lucky_hit():
    deck = [(v, s) for s in ["hearts", "diamonds", "clubs", "spades"] for v in range(2, 15)]
    random.shuffle(deck)
    side_a = [{"value": deck[i][0], "suit": deck[i][1]} for i in range(3)]
    side_b = [{"value": deck[i][0], "suit": deck[i][1]} for i in range(3, 6)]
    sa, sb = sum(c["value"] for c in side_a), sum(c["value"] for c in side_b)
    return {"side_a": side_a, "side_b": side_b, "sum_a": sa, "sum_b": sb,
            "winner": "a" if sa > sb else "b" if sb > sa else "tie"}

def play_soccer_go():
    ra = [random.randint(1, 6) for _ in range(3)]
    rb = [random.randint(1, 6) for _ in range(3)]
    ga, gb = sum(1 for r in ra if r >= 5), sum(1 for r in rb if r >= 5)
    return {"team_a": {"rolls": ra, "goals": ga}, "team_b": {"rolls": rb, "goals": gb},
            "winner": "a" if ga > gb else "b" if gb > ga else "draw", "score": f"{ga}-{gb}"}

# ========================
# WEBSOCKET MANAGER
# ========================
class ConnectionManager:
    def __init__(self):
        self.connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, ws: WebSocket, channel: str):
        await ws.accept()
        self.connections.setdefault(channel, []).append(ws)

    def disconnect(self, ws: WebSocket, channel: str):
        if channel in self.connections:
            self.connections[channel] = [c for c in self.connections[channel] if c != ws]

    async def broadcast(self, channel: str, data: dict):
        if channel not in self.connections:
            return
        dead = []
        for ws in self.connections[channel]:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            if ws in self.connections.get(channel, []):
                self.connections[channel].remove(ws)

ws_manager = ConnectionManager()

# Game State
wingo_state = {"current_round": None, "round_number": 0, "betting_open": False}
aviator_state = {"phase": "waiting", "multiplier": 1.0, "crash_point": 0, "round_number": 0, "active_bets": {}}

# ========================
# GAME ENDPOINTS
# ========================
GAME_THUMBNAILS = {
    "wingo": "https://static.prod-images.emergentagent.com/jobs/84c54715-40c5-4abb-91e0-a509c17d56ac/images/34aae1a20d9efb469d2b85a49ab2e9fe13e707baa6c1c62d029513e224cb9548.png",
    "aviator": "https://static.prod-images.emergentagent.com/jobs/84c54715-40c5-4abb-91e0-a509c17d56ac/images/eeba13d92c4c79e9977ff0e118e2697f2a08ff5ef628ea2337a876ff5e5a9a1f.png",
    "abfun": "https://static.prod-images.emergentagent.com/jobs/84c54715-40c5-4abb-91e0-a509c17d56ac/images/a085bdd19c7773da1d009a4b7c67928b695b925bcf28875e561fb3b71b7df593.png",
    "luckyhit": "https://static.prod-images.emergentagent.com/jobs/84c54715-40c5-4abb-91e0-a509c17d56ac/images/2cd47b3a5e1a2d9a5119f214df6358daefe4fb96ada74927c04d7c4ea00301fd.png",
    "soccergo": "https://static.prod-images.emergentagent.com/jobs/84c54715-40c5-4abb-91e0-a509c17d56ac/images/c9986213ccd76c492658ab207e98d3c4140ed50286c80018a700893074d170ff.png",
}

@api.get("/games/list")
async def list_games():
    games = [
        {"id": "wingo", "name": "Win Go", "description": "Color & number prediction", "thumbnail": GAME_THUMBNAILS["wingo"], "min_bet": 10, "max_bet": 10000, "status": "active", "players": random.randint(800, 1500)},
        {"id": "aviator", "name": "Aviator", "description": "Cash out before crash!", "thumbnail": GAME_THUMBNAILS["aviator"], "min_bet": 10, "max_bet": 10000, "status": "active", "players": random.randint(600, 1200)},
        {"id": "abfun", "name": "AB Fun", "description": "Andar Bahar card game", "thumbnail": GAME_THUMBNAILS["abfun"], "min_bet": 10, "max_bet": 10000, "status": "active", "players": random.randint(400, 900)},
        {"id": "luckyhit", "name": "Lucky Hit", "description": "Card comparison game", "thumbnail": GAME_THUMBNAILS["luckyhit"], "min_bet": 10, "max_bet": 10000, "status": "active", "players": random.randint(300, 700)},
        {"id": "soccergo", "name": "Soccer Go", "description": "Dice soccer simulation", "thumbnail": GAME_THUMBNAILS["soccergo"], "min_bet": 10, "max_bet": 10000, "status": "active", "players": random.randint(300, 800)},
    ]
    return {"games": games}

# --- Win Go ---
@api.get("/games/wingo/current")
async def wingo_current():
    return {"round": wingo_state["current_round"], "betting_open": wingo_state["betting_open"]}

@api.get("/games/wingo/history")
async def wingo_history(limit: int = 20):
    rounds = await db.game_rounds.find(
        {"game": "wingo", "status": "completed"}, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return {"rounds": rounds}

@api.post("/games/wingo/bet")
async def wingo_bet(req: BetRequest, request: Request):
    user = await get_current_user(request)
    if not wingo_state["betting_open"]:
        raise HTTPException(status_code=400, detail="Betting is closed")
    if req.amount < 10 or req.amount > 10000:
        raise HTTPException(status_code=400, detail="Bet must be 10-10000")
    fresh = await db.users.find_one({"_id": ObjectId(user["_id"])})
    if req.amount > fresh["balance"]:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    await db.users.update_one({"_id": ObjectId(user["_id"])}, {"$inc": {"balance": -req.amount, "total_wagered": req.amount}})
    bet = {
        "id": str(uuid.uuid4()), "user_id": user["_id"], "game": "wingo",
        "round_id": req.round_id, "bet_type": req.bet_type, "bet_value": req.bet_value,
        "amount": req.amount, "status": "pending", "winnings": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.bets.insert_one(bet)
    bet.pop("_id", None)
    return {"bet": bet, "new_balance": fresh["balance"] - req.amount}

@api.get("/games/wingo/my-bets")
async def wingo_my_bets(request: Request, limit: int = 20):
    user = await get_current_user(request)
    bets = await db.bets.find({"user_id": user["_id"], "game": "wingo"}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"bets": bets}

# --- Aviator ---
@api.get("/games/aviator/current")
async def aviator_current():
    return {
        "phase": aviator_state["phase"], "multiplier": aviator_state["multiplier"],
        "round_number": aviator_state["round_number"],
        "crash_point": aviator_state["crash_point"] if aviator_state["phase"] == "crashed" else None
    }

@api.post("/games/aviator/bet")
async def aviator_bet(req: AviatorBetRequest, request: Request):
    user = await get_current_user(request)
    if aviator_state["phase"] != "waiting":
        raise HTTPException(status_code=400, detail="Betting only during waiting phase")
    if req.amount < 10 or req.amount > 10000:
        raise HTTPException(status_code=400, detail="Bet must be 10-10000")
    fresh = await db.users.find_one({"_id": ObjectId(user["_id"])})
    if req.amount > fresh["balance"]:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    await db.users.update_one({"_id": ObjectId(user["_id"])}, {"$inc": {"balance": -req.amount, "total_wagered": req.amount}})
    bet_id = str(uuid.uuid4())
    bet = {
        "id": bet_id, "user_id": user["_id"], "game": "aviator",
        "round_number": aviator_state["round_number"], "amount": req.amount,
        "cashed_out": False, "cashout_multiplier": 0, "winnings": 0, "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.bets.insert_one(bet)
    aviator_state["active_bets"][bet_id] = {"user_id": user["_id"], "amount": req.amount}
    bet.pop("_id", None)
    return {"bet": bet, "new_balance": fresh["balance"] - req.amount}

@api.post("/games/aviator/cashout")
async def aviator_cashout(req: AviatorCashoutRequest, request: Request):
    user = await get_current_user(request)
    if aviator_state["phase"] != "flying":
        raise HTTPException(status_code=400, detail="Can only cash out during flight")
    bet = await db.bets.find_one({"id": req.bet_id, "user_id": user["_id"], "status": "active"})
    if not bet:
        raise HTTPException(status_code=404, detail="Bet not found")
    mult = aviator_state["multiplier"]
    winnings = round(bet["amount"] * mult, 2)
    await db.bets.update_one({"id": req.bet_id}, {"$set": {"cashed_out": True, "cashout_multiplier": mult, "winnings": winnings, "status": "won"}})
    await db.users.update_one({"_id": ObjectId(user["_id"])}, {"$inc": {"balance": winnings, "total_won": winnings}})
    aviator_state["active_bets"].pop(req.bet_id, None)
    return {"winnings": winnings, "multiplier": mult}

@api.get("/games/aviator/history")
async def aviator_history(limit: int = 20):
    rounds = await db.game_rounds.find({"game": "aviator", "status": "completed"}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"rounds": rounds}

@api.get("/games/aviator/my-bets")
async def aviator_my_bets(request: Request, limit: int = 20):
    user = await get_current_user(request)
    bets = await db.bets.find({"user_id": user["_id"], "game": "aviator"}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"bets": bets}

# --- Instant Games (AB Fun, Lucky Hit, Soccer Go) ---
@api.post("/games/{game_type}/play")
async def play_instant(game_type: str, req: GamePlayRequest, request: Request):
    user = await get_current_user(request)
    if game_type not in ("abfun", "luckyhit", "soccergo"):
        raise HTTPException(status_code=400, detail="Invalid game")
    if req.amount < 10 or req.amount > 10000:
        raise HTTPException(status_code=400, detail="Bet must be 10-10000")
    fresh = await db.users.find_one({"_id": ObjectId(user["_id"])})
    if req.amount > fresh["balance"]:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    await db.users.update_one({"_id": ObjectId(user["_id"])}, {"$inc": {"balance": -req.amount, "total_wagered": req.amount}})
    fee = 0.02
    if game_type == "abfun":
        result = deal_andar_bahar()
        if req.bet_value == result["winner"]:
            mult = 8.2 if req.bet_value == "tie" else 1.9
            winnings = round(req.amount * mult * (1 - fee), 2)
        else:
            winnings = 0
    elif game_type == "luckyhit":
        result = deal_lucky_hit()
        if req.bet_value == result["winner"]:
            mult = 8.0 if req.bet_value == "tie" else 1.9
            winnings = round(req.amount * mult * (1 - fee), 2)
        else:
            winnings = 0
    else:
        result = play_soccer_go()
        if req.bet_type == "winner" and req.bet_value == result["winner"]:
            mult = 3.2 if result["winner"] == "draw" else 1.9
            winnings = round(req.amount * mult * (1 - fee), 2)
        elif req.bet_type == "score" and req.bet_value == result["score"]:
            winnings = round(req.amount * 8.0 * (1 - fee), 2)
        else:
            winnings = 0
    if winnings > 0:
        await db.users.update_one({"_id": ObjectId(user["_id"])}, {"$inc": {"balance": winnings, "total_won": winnings}})
    round_id = str(uuid.uuid4())[:12]
    bet = {
        "id": str(uuid.uuid4()), "user_id": user["_id"], "game": game_type,
        "round_id": round_id, "bet_type": req.bet_type, "bet_value": req.bet_value,
        "amount": req.amount, "winnings": winnings, "status": "won" if winnings > 0 else "lost",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.bets.insert_one(bet)
    await db.game_rounds.insert_one({"id": round_id, "game": game_type, "result": result, "status": "completed", "created_at": datetime.now(timezone.utc).isoformat()})
    bet.pop("_id", None)
    updated = await db.users.find_one({"_id": ObjectId(user["_id"])})
    return {"result": result, "bet": bet, "winnings": winnings, "new_balance": updated["balance"]}

@api.get("/games/{game_type}/my-history")
async def game_my_history(game_type: str, request: Request, limit: int = 20):
    user = await get_current_user(request)
    bets = await db.bets.find({"user_id": user["_id"], "game": game_type}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"bets": bets}

# ========================
# LEADERBOARD & PROFILE
# ========================
@api.get("/leaderboard")
async def get_leaderboard(limit: int = 10):
    users = await db.users.find(
        {"role": "player", "is_banned": False},
        {"_id": 0, "password_hash": 0, "email": 0}
    ).sort("total_won", -1).limit(limit).to_list(limit)
    return {"leaderboard": users}

@api.get("/profile")
async def get_profile(request: Request):
    user = await get_current_user(request)
    total_bets = await db.bets.count_documents({"user_id": user["_id"]})
    won_bets = await db.bets.count_documents({"user_id": user["_id"], "status": "won"})
    return {
        "user": user,
        "stats": {"total_bets": total_bets, "won_bets": won_bets,
                  "win_rate": round(won_bets / total_bets * 100, 1) if total_bets > 0 else 0}
    }

# ========================
# ADMIN ENDPOINTS
# ========================
@api.get("/admin/dashboard")
async def admin_dashboard(request: Request):
    await get_admin_user(request)
    total_users = await db.users.count_documents({"role": "player"})
    total_deposits = await db.payment_transactions.count_documents({"payment_status": "paid"})
    total_bets = await db.bets.count_documents({})
    pipeline = [{"$match": {"status": "lost"}}, {"$group": {"_id": None, "total": {"$sum": "$amount"}}}]
    rev = await db.bets.aggregate(pipeline).to_list(1)
    total_revenue = rev[0]["total"] if rev else 0
    recent_users = await db.users.find({"role": "player"}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).limit(5).to_list(5)
    pending_withdrawals = await db.wallet_transactions.count_documents({"type": "withdrawal", "status": "pending"})
    return {
        "total_users": total_users, "total_deposits": total_deposits, "total_bets": total_bets,
        "total_revenue": round(total_revenue, 2), "recent_users": recent_users,
        "pending_withdrawals": pending_withdrawals
    }

@api.get("/admin/users")
async def admin_users(request: Request, skip: int = 0, limit: int = 20, search: str = ""):
    await get_admin_user(request)
    query = {"role": "player"}
    if search:
        query["$or"] = [{"email": {"$regex": search, "$options": "i"}}, {"name": {"$regex": search, "$options": "i"}}]
    users = await db.users.find(query, {"password_hash": 0}).skip(skip).limit(limit).to_list(limit)
    for u in users:
        u["_id"] = str(u["_id"])
    total = await db.users.count_documents(query)
    return {"users": users, "total": total}

@api.get("/admin/users/{user_id}")
async def admin_user_detail(user_id: str, request: Request):
    await get_admin_user(request)
    user = await db.users.find_one({"_id": ObjectId(user_id)}, {"password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user["_id"] = str(user["_id"])
    bets = await db.bets.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    txns = await db.wallet_transactions.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    return {"user": user, "bets": bets, "transactions": txns}

@api.post("/admin/users/{user_id}/balance")
async def admin_adjust_balance(user_id: str, req: AdminBalanceRequest, request: Request):
    await get_admin_user(request)
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$inc": {"balance": req.amount}})
    await db.wallet_transactions.insert_one({
        "id": str(uuid.uuid4()), "user_id": user_id, "type": "admin_adjustment",
        "amount": req.amount, "reason": req.reason, "status": "completed",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"message": f"Balance adjusted by {req.amount}"}

@api.post("/admin/users/{user_id}/ban")
async def admin_ban_user(user_id: str, request: Request):
    await get_admin_user(request)
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    new_ban = not user.get("is_banned", False)
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"is_banned": new_ban}})
    return {"message": f"User {'banned' if new_ban else 'unbanned'}", "is_banned": new_ban}

@api.get("/admin/transactions")
async def admin_transactions(request: Request, skip: int = 0, limit: int = 50, txn_type: str = ""):
    await get_admin_user(request)
    query = {}
    if txn_type:
        query["type"] = txn_type
    txns = await db.wallet_transactions.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.wallet_transactions.count_documents(query)
    return {"transactions": txns, "total": total}

@api.get("/admin/game-stats")
async def admin_game_stats(request: Request):
    await get_admin_user(request)
    pipeline = [{"$group": {"_id": "$game", "total_bets": {"$sum": 1}, "total_wagered": {"$sum": "$amount"}, "total_won": {"$sum": "$winnings"}}}]
    stats = await db.bets.aggregate(pipeline).to_list(10)
    return {"game_stats": stats}

@api.post("/admin/withdrawals/{txn_id}/approve")
async def approve_withdrawal(txn_id: str, request: Request):
    await get_admin_user(request)
    await db.wallet_transactions.update_one({"id": txn_id}, {"$set": {"status": "approved"}})
    return {"message": "Withdrawal approved"}

@api.post("/admin/withdrawals/{txn_id}/reject")
async def reject_withdrawal(txn_id: str, request: Request):
    await get_admin_user(request)
    txn = await db.wallet_transactions.find_one({"id": txn_id})
    if txn and txn.get("status") == "pending":
        await db.wallet_transactions.update_one({"id": txn_id}, {"$set": {"status": "rejected"}})
        await db.users.update_one({"_id": ObjectId(txn["user_id"]) if ObjectId.is_valid(txn["user_id"]) else None}, {"$inc": {"balance": txn["amount"]}})
    return {"message": "Withdrawal rejected, balance refunded"}

# ========================
# WEBSOCKET ENDPOINTS
# ========================
@app.websocket("/api/ws/wingo")
async def wingo_ws(ws: WebSocket):
    await ws_manager.connect(ws, "wingo")
    try:
        await ws.send_json({"type": "state", "round": wingo_state["current_round"], "betting_open": wingo_state["betting_open"]})
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(ws, "wingo")

@app.websocket("/api/ws/aviator")
async def aviator_ws(ws: WebSocket):
    await ws_manager.connect(ws, "aviator")
    try:
        await ws.send_json({"type": "state", "phase": aviator_state["phase"], "multiplier": aviator_state["multiplier"], "round_number": aviator_state["round_number"]})
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(ws, "aviator")

# ========================
# BACKGROUND GAME LOOPS
# ========================
async def wingo_loop():
    await asyncio.sleep(3)
    while True:
        try:
            wingo_state["round_number"] += 1
            round_id = str(uuid.uuid4())[:12]
            wingo_state["current_round"] = {"id": round_id, "round_number": wingo_state["round_number"], "status": "betting", "betting_seconds": 55}
            wingo_state["betting_open"] = True
            await ws_manager.broadcast("wingo", {"type": "round_start", "round_id": round_id, "round_number": wingo_state["round_number"], "betting_seconds": 55})
            await asyncio.sleep(50)
            await ws_manager.broadcast("wingo", {"type": "closing", "round_id": round_id, "seconds_left": 5})
            await asyncio.sleep(5)
            wingo_state["betting_open"] = False
            result = generate_wingo_result()
            await db.game_rounds.insert_one({"id": round_id, "game": "wingo", "round_number": wingo_state["round_number"], "result": result, "status": "completed", "created_at": datetime.now(timezone.utc).isoformat()})
            bets = await db.bets.find({"round_id": round_id, "game": "wingo", "status": "pending"}).to_list(1000)
            for bet in bets:
                w = calc_wingo_winnings(bet, result)
                if w > 0:
                    await db.users.update_one({"_id": ObjectId(bet["user_id"])}, {"$inc": {"balance": w, "total_won": w}})
                    await db.bets.update_one({"_id": bet["_id"]}, {"$set": {"status": "won", "winnings": round(w, 2)}})
                else:
                    await db.bets.update_one({"_id": bet["_id"]}, {"$set": {"status": "lost", "winnings": 0}})
            wingo_state["current_round"] = {"id": round_id, "round_number": wingo_state["round_number"], "status": "completed", "result": result}
            await ws_manager.broadcast("wingo", {"type": "result", "round_id": round_id, "result": result, "round_number": wingo_state["round_number"]})
            await asyncio.sleep(5)
        except Exception as e:
            logger.error(f"WinGo loop error: {e}")
            await asyncio.sleep(5)

async def aviator_loop():
    await asyncio.sleep(5)
    while True:
        try:
            aviator_state["round_number"] += 1
            aviator_state["phase"] = "waiting"
            aviator_state["multiplier"] = 1.0
            aviator_state["active_bets"] = {}
            crash_point = generate_crash_point()
            aviator_state["crash_point"] = round(crash_point, 2)
            await ws_manager.broadcast("aviator", {"type": "waiting", "round_number": aviator_state["round_number"], "countdown": 8})
            await asyncio.sleep(8)
            aviator_state["phase"] = "flying"
            await ws_manager.broadcast("aviator", {"type": "flying", "round_number": aviator_state["round_number"]})
            mult = 1.0
            while mult < crash_point:
                mult = round(mult + 0.01, 2)
                aviator_state["multiplier"] = mult
                await ws_manager.broadcast("aviator", {"type": "tick", "multiplier": mult})
                await asyncio.sleep(0.05)
            aviator_state["phase"] = "crashed"
            aviator_state["multiplier"] = crash_point
            for bid in list(aviator_state["active_bets"].keys()):
                await db.bets.update_one({"id": bid}, {"$set": {"status": "lost", "winnings": 0}})
            await db.game_rounds.insert_one({"id": str(uuid.uuid4())[:12], "game": "aviator", "round_number": aviator_state["round_number"], "crash_point": crash_point, "status": "completed", "created_at": datetime.now(timezone.utc).isoformat()})
            await ws_manager.broadcast("aviator", {"type": "crashed", "crash_point": crash_point, "round_number": aviator_state["round_number"]})
            await asyncio.sleep(5)
        except Exception as e:
            logger.error(f"Aviator loop error: {e}")
            await asyncio.sleep(5)

# ========================
# STARTUP
# ========================
async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "email": admin_email, "password_hash": hash_password(admin_password),
            "name": "Admin", "role": "admin", "balance": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Admin seeded: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

async def create_indexes():
    await db.users.create_index("email", unique=True)
    await db.bets.create_index([("user_id", 1), ("game", 1)])
    await db.bets.create_index("round_id")
    await db.game_rounds.create_index([("game", 1), ("status", 1)])
    await db.wallet_transactions.create_index("user_id")
    await db.payment_transactions.create_index("session_id")
    await db.login_attempts.create_index("identifier")

@app.on_event("startup")
async def startup():
    await seed_admin()
    await create_indexes()
    asyncio.create_task(wingo_loop())
    asyncio.create_task(aviator_loop())
    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(f"# Test Credentials\n\n## Admin\n- Email: {os.environ.get('ADMIN_EMAIL', 'admin@example.com')}\n- Password: {os.environ.get('ADMIN_PASSWORD', 'admin123')}\n- Role: admin\n\n## Test User\n- Register via /register\n- Welcome bonus: 100\n\n## Auth Endpoints\n- POST /api/auth/login\n- POST /api/auth/register\n- GET /api/auth/me\n- POST /api/auth/logout\n")

@app.on_event("shutdown")
async def shutdown():
    client.close()

app.include_router(api)

frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[frontend_url, "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)
