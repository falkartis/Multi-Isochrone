# Multi-Isochrone

## Getting started

Run following commands in the repository folder:

In order to install dpepndencies (google maps api)

```
npm ci
```

To compile the ts file(s):

```
tsc --project tsconfig.json
```

Start a server. I used Apache2, other options may also work, although I didn't have luck because of CORS and Mime types.

Open up a browser and go to http://127.0.0.1:8080/ or the address your server is serving.

## Important note

This software uses the google maps api, currently I'm using a development api key.
To use this software in production another api key is needed.

## Known issues

At longitudes near -180º or +180º this software may fail.

