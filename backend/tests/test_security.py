from app.core.security import hash_password, verify_password, create_access_token, decode_access_token


def test_password_hash_and_verify_roundtrip():
    hashed = hash_password("mysecret123")
    assert verify_password("mysecret123", hashed) is True


def test_wrong_password_fails_verification():
    hashed = hash_password("mysecret123")
    assert verify_password("wrongpassword", hashed) is False


def test_access_token_roundtrip():
    employee_id = "3fa85f64-5717-4562-b3fc-2c963f66afa6"
    token = create_access_token(employee_id)
    decoded = decode_access_token(token)
    assert decoded == employee_id


def test_invalid_token_returns_none():
    assert decode_access_token("not-a-real-token") is None
