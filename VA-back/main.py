
from flask import Flask, request, jsonify
from flask_cors import CORS

from ai import get_answer, listen

app = Flask(__name__)
CORS(app)


@app.route('/api/post_question', methods=['POST'])
def post_question():
    data = request.get_json()
    question = data.get("question", "")

    if not question:
        return jsonify({"status": "error", "message": "question missing"}), 400

    try:
        answer = get_answer(question)
        return jsonify({"answer": answer})
    except Exception as e:
        return jsonify({"error": str(e)}), 500



if __name__ == '__main__':
    app.run(debug=True)
