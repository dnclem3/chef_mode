module.exports = {
  async rewrites() {
    return [
      {
        source: '/api/extract-recipe',
        destination: 'http://localhost:3001/api/extract_recipe.py'  // Proxy to local Python server
      }
    ];
  }
}; 