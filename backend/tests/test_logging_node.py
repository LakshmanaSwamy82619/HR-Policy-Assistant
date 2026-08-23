import logging
import uuid

from app.agent.nodes.logging_node import log_turn


def test_log_turn_runs_without_error(caplog):
    with caplog.at_level(logging.INFO):
        log_turn(
            conversation_id=uuid.uuid4(),
            employee_id=uuid.uuid4(),
            question="How many sick days do I have?",
            predicted_intent="personal_data",
            route_taken="hris",
            citations=None,
            ticket_id=None,
        )
    assert any("chat_turn" in record.message for record in caplog.records)


def test_log_turn_handles_escalation_with_ticket(caplog):
    ticket_id = uuid.uuid4()
    with caplog.at_level(logging.INFO):
        log_turn(
            conversation_id=uuid.uuid4(),
            employee_id=uuid.uuid4(),
            question="I want to report harassment",
            predicted_intent="sensitive",
            route_taken="escalation",
            citations=None,
            ticket_id=ticket_id,
        )
    assert len(caplog.records) >= 1
