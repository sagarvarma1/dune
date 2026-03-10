import os
import anthropic
from prompts import SYSTEM_PROMPT

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))


def nl_to_sql(question: str) -> str:
    """Convert a natural language question to a DuneSQL query using Claude."""
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": question}],
    )
    sql = message.content[0].text.strip()
    # Clean up any accidental markdown fences
    if sql.startswith("```"):
        sql = sql.split("\n", 1)[1] if "\n" in sql else sql[3:]
    if sql.endswith("```"):
        sql = sql[:-3]
    return sql.strip()
