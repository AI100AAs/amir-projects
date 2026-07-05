"""
Seed script to populate the ELI5 News Database with demo articles.
Run this to see the article linking feature in action.
"""

import os
import sys

# Remove existing DB to start fresh
if os.path.exists('news.db'):
    os.remove('news.db')
    print("Removed old database.")

from database import init_db, add_article, update_article_summary, add_link
from llm_service import summarize_article_eli5, find_article_links

init_db()
print("Initialized fresh database.")

# Demo articles
demo_articles = [
    {
        "title": "NASA Discovers Water on Mars",
        "source_url": "https://example.com/nasa-mars-water",
        "text": "NASA scientists announced today that they have found definitive evidence of liquid water beneath the surface of Mars. Using data from the Mars Reconnaissance Orbiter, researchers identified dark streaks on Martian slopes that appear to be caused by flowing water during warm seasons. This discovery has significant implications for the possibility of microbial life on the red planet and future human exploration missions."
    },
    {
        "title": "New Study Suggests Mars Water May Not Support Life",
        "source_url": "https://example.com/mars-water-life",
        "text": "A controversial new study from the European Space Agency challenges recent claims about Martian water. Researchers argue that the dark streaks previously identified as water flows are more likely caused by dry dust avalanches. The study claims the chemical signatures interpreted as water are actually consistent with perchlorate salts interacting with atmospheric moisture, not subsurface liquid water. This contradicts earlier NASA findings."
    },
    {
        "title": "Global Temperatures Reach Record High in 2024",
        "source_url": "https://example.com/global-warming-2024",
        "text": "Climate scientists at the World Meteorological Organization confirmed that 2024 was the hottest year on record globally. Average temperatures were 1.5 degrees Celsius above pre-industrial levels. Extreme weather events including hurricanes, droughts, and wildfires increased dramatically. Experts warn that without immediate emission reductions, the Paris Agreement targets will be impossible to meet."
    },
    {
        "title": "2024 Climate Summit Agrees on New Emission Targets",
        "source_url": "https://example.com/climate-summit-2024",
        "text": "World leaders gathered at the UN Climate Summit in Geneva and reached a landmark agreement to reduce carbon emissions by 45% before 2035. The deal includes binding commitments from major economies and a new fund to help developing nations transition to renewable energy. Environmental activists praised the move but warned that implementation remains the biggest challenge."
    }
]

article_ids = []

for article_data in demo_articles:
    print(f"\nProcessing: {article_data['title']}")
    
    # Generate ELI5 summary
    summary, confidence, modification, topics = summarize_article_eli5(
        article_data['title'], 
        article_data['text']
    )
    
    # Add to database
    article_id = add_article(
        title=article_data['title'],
        original_text=article_data['text'],
        source_url=article_data['source_url'],
        eli5_summary=summary,
        confidence_level=confidence,
        modification_level=modification,
        topics=topics
    )
    article_ids.append(article_id)
    
    print(f"  Added article ID {article_id}")
    print(f"  Summary: {summary[:80]}...")
    print(f"  Topics: {topics}")
    
    # Find links with existing articles
    new_article = {
        'id': article_id,
        'title': article_data['title'],
        'eli5_summary': summary,
        'topics': topics
    }
    
    from database import get_all_articles
    existing = [a for a in get_all_articles() if a['id'] != article_id]
    
    links = find_article_links(new_article, existing)
    
    for link in links:
        add_link(
            source_article_id=article_id,
            target_article_id=link['target_article_id'],
            link_type=link['link_type'],
            description=link['description'],
            confidence=link['confidence']
        )
        print(f"  -> Link: {link['link_type']} to article {link['target_article_id']} ({link['description']})")

print(f"\n\nSeeded {len(article_ids)} demo articles!")
print("Run 'python3 app.py' and visit http://localhost:5000 to view your database.")
