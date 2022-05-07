# Connect4
Connect4, a web app developed for TAW project's exam in Ca Foscari UNIVE

# Installation 
BACKEND:
1. Install dependency with npm install when in the webServer folder.
2. Compile the code with "npm run compile".
2. Run server with "node connect4_server".
3. IMPORTANT. It may happens that mongoose module will give an error. In that case go on "@types" of node_modules folder and delete index.d.ts in mongoose folder.


FRONTEND: 
1. Install dependency with npm install when in the webApp folder.
2. To run the application and use it run "ng serve".
3. If you want to use the application in production mode, run "ng build" and copy static files created in "/dist" folder to your server/container.