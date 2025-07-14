from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
import sys
import os
import logging
from recipe_scrapers import scrape_me

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def extract_recipe(url, user_agent='default'):
    try:
        logger.debug(f"Attempting to scrape recipe from URL: {url}")
        logger.debug(f"Using User-Agent: {user_agent}")
        
        # Configure wild_mode for better compatibility
        scraper = scrape_me(
            url,
            wild_mode=True  # This enables more flexible parsing
        )
        logger.debug("Successfully created scraper instance")
        
        # Get ingredients first and log them
        ingredients = scraper.ingredients()
        logger.debug(f"Extracted ingredients: {ingredients}")
        
        # Get instructions and log them
        instructions = scraper.instructions_list()
        logger.debug(f"Extracted instructions: {instructions}")
        
        recipe = {
            "title": scraper.title(),
            "image": scraper.image() if scraper.image() else None,
            "totalTime": scraper.total_time() or 0,
            "yields": scraper.yields(),
            "sourceUrl": url,
            "prep": {
                "ingredients": [
                    {"item": ingredient}
                    for ingredient in ingredients
                ]
            },
            "cook": {
                "steps": instructions 
            }
        }
        logger.debug("Successfully extracted recipe data")
        
        return {"success": True, "data": recipe}
    except Exception as e:
        logger.error(f"Error extracting recipe: {str(e)}", exc_info=True)
        return {"success": False, "error": str(e)}

# Handle both serverless function and command line usage
if __name__ == "__main__":
    logger.debug("Running in command line mode")
    if len(sys.argv) > 1:
        url = sys.argv[1]
        logger.debug(f"Received URL argument: {url}")
        result = extract_recipe(url)
        print(json.dumps(result))
        sys.exit(0 if result["success"] else 1)
    else:
        logger.error("No URL provided in command line arguments")
        sys.exit(1)
else:
    logger.debug("Running in serverless function mode")
    # For Vercel serverless function
    from http.server import BaseHTTPRequestHandler
    class handler(BaseHTTPRequestHandler):
        def do_GET(self):
            parsed_url = urlparse(self.path)
            params = parse_qs(parsed_url.query)
            url = params.get('url', [None])[0]
            user_agent = self.headers.get('user-agent', 'default')

            logger.debug(f"Received request for URL: {url}")
            logger.debug(f"User-Agent: {user_agent}")

            if not url:
                logger.error("No URL provided in request")
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'URL is required'}).encode('utf-8'))
                return

            result = extract_recipe(url, user_agent)
            logger.debug(f"Extract result: {json.dumps(result)}")
            
            if result["success"]:
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(result["data"]).encode('utf-8'))
            else:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': result["error"]}).encode('utf-8'))

    sys.modules['__main__'].handler = handler # type: ignore 