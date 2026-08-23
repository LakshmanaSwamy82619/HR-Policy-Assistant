from app.guardrails.sensitive_topics import detect_sensitive_topic


def test_detects_harassment():
    assert detect_sensitive_topic("I want to report harassment from my manager") == "harassment"


def test_detects_termination():
    assert detect_sensitive_topic("What happens to my benefits after I'm fired?") == "termination"


def test_detects_medical_leave():
    assert detect_sensitive_topic("How do I apply for FMLA?") == "medical_leave"


def test_no_match_for_ordinary_policy_question():
    assert detect_sensitive_topic("How many annual leave days do I accrue per year?") is None


def test_case_insensitive_match():
    assert detect_sensitive_topic("I EXPERIENCED HARASSMENT at work") == "harassment"
