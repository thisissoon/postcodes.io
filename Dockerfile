FROM dockerfile/nodejs
ENV ONS_ZIP_URL https://geoportal.statistics.gov.uk/Docs/PostCodes/ONSPD_MAY_2013_csv.zip
RUN mkdir -p /tmp/ons && cd /tmp/ons && curl -L -o ons.zip $ONS_ZIP_URL
ADD package.json /tmp/package.json
RUN cd /tmp && npm install -g
ADD . /postcodes.io
ENV NODE_ENV docker
WORKDIR /postcodes.io
CMD unzip /tmp/ons/ons.zip -d /tmp/ons/ && importons `find /tmp/ons -type f -name ONS*.csv`
