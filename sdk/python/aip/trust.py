"""Ed25519 signing and verification"""
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
import base64
from .types import Envelope
from .envelope import canonical_payload


def generate_key_pair() -> tuple[Ed25519PrivateKey, Ed25519PublicKey]:
    private = Ed25519PrivateKey.generate()
    return private, private.public_key()


def export_public_key(key: Ed25519PublicKey) -> str:
    raw = key.public_bytes(Encoding.Raw, PublicFormat.Raw)
    return f"ed25519:{base64.b64encode(raw).decode()}"


def sign_envelope(env: Envelope, private_key: Ed25519PrivateKey) -> str:
    data = canonical_payload(env).encode()
    sig = private_key.sign(data)
    return f"ed25519:{base64.b64encode(sig).decode()}"


def verify_envelope(env: Envelope, public_key: Ed25519PublicKey) -> bool:
    if not env.signature:
        return False
    sig_b64 = env.signature.replace("ed25519:", "")
    sig = base64.b64decode(sig_b64)
    data = canonical_payload(env).encode()
    try:
        public_key.verify(sig, data)
        return True
    except Exception:
        return False
