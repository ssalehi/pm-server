#!/bin/bash

DATE=`date '+%Y-%m-%d'`
cd ../../
mkdir -p Images/Archive/${DATE}
mkdir -p Images/storage
mkdir -p server/public/temp

cd Images

wget --save-cookies cookies.txt --keep-session-cookies $1
wget --load-cookies cookies.txt -O chunk.zip $2

unzip chunk.zip -d ./chunk
rm chunk.zip
cp -R chunk/*/* Archive/${DATE}/
echo start conversion of png images to jpeg
find ./chunk -name "*.png" -exec mogrify -format jpeg {} \;
find ./chunk -name "*.png" -exec rm {} \;
find ./chunk -type f -iname '*.jpeg' -exec jpegoptim size=200k {} +
echo transfering images to temp directory
cp -R chunk/*/* ../server/public/temp/
rm cookies.txt Ef*
rm -r chunk
