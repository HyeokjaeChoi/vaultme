#!/bin/sh
# usage: [PREPEND="const ONLY=[...]"] build.sh a11-common.js a11-frames-X.js  -> ../code.js = prepend + prelude + files + tail
cd "$(dirname "$0")"
{ [ -n "$PREPEND" ] && printf "%s\n" "$PREPEND"; cat a11-prelude.js "$@" a11-tail.js; } > ../code.js && node --check ../code.js
