#!/usr/bin/env python3

import sys
import json
from recipe_scrapers import scrape_me

def extract_recipe(url):
    try:
        # Create a scraper instance
        scraper = scrape_me(url)
        
        # Extract basic recipe information
        recipe = {
            "title": scraper.title(),
            "image": scraper.image() if scraper.image() else None,
            "totalTime": scraper.total_time() or 0,  # Default to 0 if None
            "yields": scraper.yields(),
            "sourceUrl": url,
            "prep": {
                "ingredients": [
                    {"item": ingredient, "quantity": None}  # We'll parse quantities in a future version
                    for ingredient in scraper.ingredients()
                ]
            },
            "cook": {
                "steps": scraper.instructions_list()  # Get instructions as a list
            }
        }
        
        # Return success response
        return {
            "success": True,
            "data": recipe
        }
        
    except Exception as e:
        # Return error response
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    # Expect URL as first argument
    if len(sys.argv) != 2:
        print(json.dumps({
            "success": False,
            "error": "URL argument is required"
        }))
        sys.exit(1)
        
    url = sys.argv[1]
    result = extract_recipe(url)
    print(json.dumps(result)) 