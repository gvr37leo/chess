@echo off
pushd client
start watchify src/main.ts --debug -p [ tsify ] -o bundle.js
popd

pushd server
start tsc
cd ./out/server
start nodemon server.js
popd