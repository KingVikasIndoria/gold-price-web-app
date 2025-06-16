from flask import Flask, render_template
import http.client
import json

app = Flask(__name__)

def fetch_price(city):
    try:
        conn = http.client.HTTPSConnection("gold-silver-live-price-india.p.rapidapi.com")
        headers = {
            'x-rapidapi-key': "YOUR_API_KEY_HERE",
            'x-rapidapi-host': "gold-silver-live-price-india.p.rapidapi.com",
            'city': city
        }
        conn.request("GET", "/gold_price_india_city_value/", headers=headers)
        res = conn.getresponse()
        data = res.read()
        json_data = json.loads(data)

        return {
            "city": city,
            "price_22k": json_data.get(f"{city}_22k", "N/A"),
            "price_24k": json_data.get(f"{city}_24k", "N/A"),
            "unit": json_data.get("Unit", "N/A")
        }

    except Exception as e:
        return {
            "city": city,
            "price_22k": "Error",
            "price_24k": "-",
            "unit": "-",
            "error": str(e)
        }

@app.route("/")
def index():
    with open("cities_list.txt", "r", encoding="utf-8") as f:
        cities = [line.strip() for line in f if line.strip()]
    prices = [fetch_price(city) for city in cities]
    return render_template("index.html", prices=prices)
