#!/bin/bash

# Complete API Test Script for Parental Guide Feature
echo "🧪 Testing Parental Guide API - Complete Flow"
echo "=============================================="
echo ""

BASE_URL="http://localhost:3013"

# Test 1: Scrape Dexter (tt0773262 - Known to have Severe nudity)
echo "📺 Test 1: Scraping Dexter (tt0773262) - Should have SEVERE nudity"
echo "-------------------------------------------------------------------"
SCRAPE_RESULT=$(curl -s -X POST "${BASE_URL}/api/ParentalGuide/scrape" \
  -H "Content-Type: application/json" \
  -d '{
    "imdbId": "tt0773262",
    "tmdbId": 1393,
    "mediaType": "series",
    "title": "Dexter"
  }' 2>&1)

# Check if auth error
if echo "$SCRAPE_RESULT" | grep -q "Access token required"; then
  echo "❌ Test 1 FAILED: Auth required (expected - endpoint is protected)"
  echo "   Using test scraper instead..."
  echo ""
  cd /Users/starship/programming/BorrowArr/server
  node scripts/testParentalGuideScraper.js 2>&1 | grep -A5 "Dexter"
  echo ""
else
  echo "✅ Scrape Response:"
  echo "$SCRAPE_RESULT" | python3 -m json.tool 2>/dev/null || echo "$SCRAPE_RESULT"
  echo ""
fi

sleep 2

# Test 2: Check batch API with Dexter's IMDb ID
echo "📺 Test 2: Checking batch API for Dexter (tt0773262)"
echo "-----------------------------------------------------"
BATCH_RESULT=$(curl -s -X POST "${BASE_URL}/api/ParentalGuide/check-batch" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "imdbId": "tt0773262",
        "tmdbId": 1393,
        "mediaType": "series"
      }
    ]
  }')

echo "Response:"
echo "$BATCH_RESULT" | python3 -m json.tool
echo ""

# Extract nudity severity from response
SEVERITY=$(echo "$BATCH_RESULT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    nudity_map = data.get('nudityMap', {})
    dexter_data = nudity_map.get('tt0773262', {})
    print(dexter_data.get('severity', 'NOT_FOUND'))
except:
    print('ERROR')
" 2>/dev/null)

if [ "$SEVERITY" = "Severe" ]; then
  echo "✅ Test 2 PASSED: Dexter correctly identified as having SEVERE nudity"
elif [ "$SEVERITY" = "NOT_FOUND" ] || [ "$SEVERITY" = "ERROR" ]; then
  echo "❌ Test 2 FAILED: No data found in database for Dexter"
  echo "   Data needs to be scraped first (run test scraper or wait for first frontend load)"
else
  echo "❌ Test 2 FAILED: Expected 'Severe', got '$SEVERITY'"
fi
echo ""

# Test 3: Check batch API with The Matrix (tt0133093 - Known to have Mild nudity)
echo "🎬 Test 3: Checking batch API for The Matrix (tt0133093) - Should have MILD nudity"
echo "-----------------------------------------------------------------------------------"
MATRIX_RESULT=$(curl -s -X POST "${BASE_URL}/api/ParentalGuide/check-batch" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "imdbId": "tt0133093",
        "tmdbId": 603,
        "mediaType": "movie"
      }
    ]
  }')

echo "Response:"
echo "$MATRIX_RESULT" | python3 -m json.tool
echo ""

MATRIX_SEVERITY=$(echo "$MATRIX_RESULT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    nudity_map = data.get('nudityMap', {})
    matrix_data = nudity_map.get('tt0133093', {})
    print(matrix_data.get('severity', 'NOT_FOUND'))
except:
    print('ERROR')
" 2>/dev/null)

if [ "$MATRIX_SEVERITY" = "Mild" ]; then
  echo "✅ Test 3 PASSED: The Matrix correctly identified as having MILD nudity"
elif [ "$MATRIX_SEVERITY" = "NOT_FOUND" ] || [ "$MATRIX_SEVERITY" = "ERROR" ]; then
  echo "❌ Test 3 FAILED: No data found in database for The Matrix"
else
  echo "❌ Test 3 FAILED: Expected 'Mild', got '$MATRIX_SEVERITY'"
fi
echo ""

# Test 4: Check batch API with Toy Story (tt0114709 - Should have NO nudity)
echo "🎬 Test 4: Checking batch API for Toy Story (tt0114709) - Should have NO nudity"
echo "--------------------------------------------------------------------------------"
TOY_STORY_RESULT=$(curl -s -X POST "${BASE_URL}/api/ParentalGuide/check-batch" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "imdbId": "tt0114709",
        "tmdbId": 862,
        "mediaType": "movie"
      }
    ]
  }')

echo "Response:"
echo "$TOY_STORY_RESULT" | python3 -m json.tool
echo ""

TOY_STORY_SEVERITY=$(echo "$TOY_STORY_RESULT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    nudity_map = data.get('nudityMap', {})
    toy_story_data = nudity_map.get('tt0114709', {})
    print(toy_story_data.get('severity', 'NOT_FOUND'))
except:
    print('ERROR')
" 2>/dev/null)

if [ "$TOY_STORY_SEVERITY" = "None" ]; then
  echo "✅ Test 4 PASSED: Toy Story correctly identified as having NO nudity"
elif [ "$TOY_STORY_SEVERITY" = "NOT_FOUND" ] || [ "$TOY_STORY_SEVERITY" = "ERROR" ]; then
  echo "❌ Test 4 FAILED: No data found in database for Toy Story"
else
  echo "❌ Test 4 FAILED: Expected 'None', got '$TOY_STORY_SEVERITY'"
fi
echo ""

# Summary
echo "=============================================="
echo "📊 TEST SUMMARY"
echo "=============================================="
echo "Note: If tests show 'NOT_FOUND', the database needs to be populated."
echo "Run the test scraper to populate data:"
echo "  cd server && node scripts/testParentalGuideScraper.js"
echo ""
echo "Or open the frontend with filters enabled to trigger auto-scraping."
echo "=============================================="

