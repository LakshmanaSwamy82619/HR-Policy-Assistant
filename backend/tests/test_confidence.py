from unittest.mock import MagicMock

from app.rag.confidence import is_confident


def _fake_chunk():
    return MagicMock()


def test_confident_when_top_score_above_threshold():
    scored = [(_fake_chunk(), 0.85)]
    assert is_confident(scored) is True


def test_not_confident_when_top_score_below_threshold():
    scored = [(_fake_chunk(), 0.40)]
    assert is_confident(scored) is False


def test_not_confident_when_no_chunks_returned():
    assert is_confident([]) is False


def test_confident_uses_only_top_score():
    # Even if a lower-ranked chunk is weak, only the top score should decide.
    scored = [(_fake_chunk(), 0.90), (_fake_chunk(), 0.10)]
    assert is_confident(scored) is True


def test_filter_confident_chunks_drops_weak_matches():
    from app.rag.confidence import filter_confident_chunks
    scored = [(_fake_chunk(), 0.90), (_fake_chunk(), 0.75), (_fake_chunk(), 0.40)]
    filtered = filter_confident_chunks(scored)
    assert len(filtered) == 2
    assert all(score >= 0.72 for _, score in filtered)


def test_filter_confident_chunks_keeps_all_when_all_strong():
    from app.rag.confidence import filter_confident_chunks
    scored = [(_fake_chunk(), 0.95), (_fake_chunk(), 0.80)]
    filtered = filter_confident_chunks(scored)
    assert len(filtered) == 2