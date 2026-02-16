from pydantic import BaseModel

class AssistantQuery(BaseModel):
    query: str

class AssistantResponse(BaseModel):
    response: str
