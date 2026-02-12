from abc import ABC, abstractmethod
from typing import List, Dict, Any

class MarketAdapter(ABC):
    @abstractmethod
    def search_markets(self, query: str) -> List[Dict[str, Any]]:
        pass
    
    @abstractmethod
    def get_market_details(self, market_id: str) -> Dict[str, Any]:
        pass
