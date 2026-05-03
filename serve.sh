#!/bin/bash
# 가족 게시판 로컬 서버 실행 스크립트
# 크롬의 file:// CORS 제한을 피하기 위해 HTTP 서버를 사용합니다.

PORT=8080

echo "🏠 Family Board 로컬 서버를 시작합니다..."
echo "👉 브라우저에서 http://localhost:${PORT} 으로 접속하세요"
echo "⏹️  종료하려면 Ctrl+C 를 누르세요"
echo ""

# Python 3 우선, 없으면 Python 2 시도
if command -v python3 &>/dev/null; then
    python3 -m http.server $PORT
elif command -v python &>/dev/null; then
    python -m SimpleHTTPServer $PORT
else
    echo "❌ Python이 설치되어 있지 않습니다."
    echo "   Node.js가 있다면: npx serve ."
fi
