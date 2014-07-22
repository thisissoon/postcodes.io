FROM dockerfile/nodejs
ENV ONS_ZIP_URL https://geoportal.statistics.gov.uk/Docs/PostCodes/ONSPD_MAY_2013_csv.zip
RUN mkdir -p /tmp/ons && cd /tmp/ons && curl -sL -o ons.zip $ONS_ZIP_URL
RUN apt-get update && apt-get install -y libpq-dev
RUN mkdir -p /tmp/node
ADD package.json /tmp/node/package.json
ADD npm-shrinkwrap.json /tmp/node/npm-shrinkwrap.json
RUN cd /tmp/node && npm install -g
ADD . /postcodes.io
ENV NODE_ENV docker
WORKDIR /postcodes.io
CMD unzip /tmp/ons/ons.zip -d /tmp/ons/ && importons `find /tmp/ons -type f -name ONS*.csv`
