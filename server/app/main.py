from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import time
from typing import List

app = FastAPI(title="Prediction Market Hedging API")

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class BusinessDescription(BaseModel):
    description: str

class Risk(BaseModel):
    id: str
    name: str
    likelihood: str
    impact: str
    description: str

class AnalyzeResponse(BaseModel):
    risks: List[Risk]

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Risk Engine Online"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/analyze", response_model=AnalyzeResponse)
def analyze_risks(data: BusinessDescription):
    # Simulate processing time
    time.sleep(1.5)
    
    # Mock Response for MVP
    mock_risks = [
        Risk(
            id="risk-1",
            name="Coffee Bean Price Surge",
            likelihood="High",
            impact="Severe",
            description="Exposure to Arabica futures volatility due to reliance on Brazilian imports."
        ),
        Risk(
            id="risk-2",
            name="Supply Chain Disruption",
            likelihood="Medium",
            impact="High",
            description="Potential shipping delays affecting inventory levels during peak season."
        ),
        Risk(
            id="risk-3",
            name="Local Foot Traffic Decline",
            likelihood="Low",
            impact="Moderate",
            description="Risk of reduced revenue due to local economic downturn or weather events."
        )
    ]
    
    return AnalyzeResponse(risks=mock_risks)
