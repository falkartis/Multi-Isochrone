# Multi-Isochrone

## Getting started

Run following commands in the repository folder:

In order to install dpepndencies (google maps api)

```
npm ci
```

To compile the ts file(s):

```
tsc -t es6 *ts --outFile index.js
```

Start a server. I used python, other options may also work.

```
python3 -m http.server 8080 --bind 127.0.0.1 --directory ./
```

Open up a browser and go to http://127.0.0.1:8080/