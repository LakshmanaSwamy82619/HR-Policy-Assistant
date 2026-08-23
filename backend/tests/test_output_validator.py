from app.guardrails.output_validator import validate_rag_output


def test_valid_answer_with_citation_passes():
    assert validate_rag_output("You get 18 days of leave.", [{"section_id": "2"}]) is True


def test_empty_answer_fails():
    assert validate_rag_output("", [{"section_id": "2"}]) is False


def test_answer_with_no_citations_fails():
    assert validate_rag_output("You get 18 days of leave.", []) is False


def test_whitespace_only_answer_fails():
    assert validate_rag_output("   ", [{"section_id": "2"}]) is False
