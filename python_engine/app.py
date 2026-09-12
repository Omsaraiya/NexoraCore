from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
# Allow our Node.js/HTML frontend to securely talk to this Python backend
CORS(app)

@app.route('/api/calculate-tax', methods=['POST'])
def calculate_tax():
    try:
        data = request.get_json(silent=True) or {}

        total_income = float(data.get('income', 0) or 0)
        total_expense = float(data.get('expense', 0) or 0)

        gross_profit = total_income - total_expense
        gst = gross_profit * 0.18 if gross_profit > 0 else 0
        net_profit = gross_profit - gst

        return jsonify({
            "success": True,
            "engine": "Python Microservice 1.0",
            "gross_profit": round(gross_profit, 2),
            "estimated_tax": round(gst, 2),
            "net_profit": round(net_profit, 2),
            "gst": round(gst, 2)
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "data": {"gross_profit": 0, "gst": 0, "net_profit": 0}
        }), 500

if __name__ == '__main__':
    # Running on port 5000 so it doesn't clash with Node on 3000
    print("🚀 Python Financial Engine running on http://127.0.0.1:5000")
    app.run(port=5000, debug=True)