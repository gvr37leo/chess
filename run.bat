pushd client
start tsc
start watchify out/main.js -o bundle.js -d
popd

pushd server
start tsc
cd ./out/server
start node server.js
popd