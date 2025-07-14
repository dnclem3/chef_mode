from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
import sys
import os
from recipe_scrapers import scrape_me  # Assuming this is from your requirements.txt

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Parse URL and query params
        parsed_url = urlparse(self.path)
        params = parse_qs(parsed_url.query)
        url = params.get('url', [None])[0]
        user_agent = self.headers.get('user-agent')

        if not url:
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'URL is required'}).encode('utf-8'))
            return

        try:
            # Your existing extraction logic (adapted from recipe_extractor.py)
            scraper = scrape_me(url, headers={'User-Agent': user_agent or 'default'})

            recipe = {
                "title": scraper.title(),
                "image": scraper.image() if scraper.image() else None,
                "totalTime": scraper.total_time() or 0,
                "yields": scraper.yields(),
                "sourceUrl": url,
                "prep": {
                    "ingredients": [
                        {"item": ingredient, "quantity": None}
                        for ingredient in scraper.ingredients()
                    ]
                },
                "cook": {
                    "steps": scraper.instructions_list()
                }
            }

            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(recipe).encode('utf-8'))

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))

# For Vercel, this is the entry point
sys.modules['__main__'].handler = handler 