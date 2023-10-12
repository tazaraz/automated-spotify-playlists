all:
	cd backend && npm install
	cd frontend && npm install

clean:
	cd frontend && rm -rf node_modules .nuxt
	cd backend && rm -rf node_modules