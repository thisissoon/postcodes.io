FROM dockerfile/nodejs
ENV ONS_ZIP_URL https://geoportal.statistics.gov.uk/Docs/PostCodes/ONSPD_MAY_2013_csv.zip
RUN mkdir -p /tmp/ons && cd /tmp/ons && curl -L -o ons.zip $ONS_ZIP_URL
RUN npm install -g pg@~3.3.0
RUN npm install -g express@~4.6.1
RUN npm install -g morgan@~1.1.1
RUN npm install -g static-favicon@~1.0.0
RUN npm install -g body-parser@~1.4.3
RUN npm install -g jade@~1.3.0
RUN npm install -g bunyan@~0.23.1
RUN npm install -g commonlog-bunyan@~0.3.0
RUN npm install -g node.extend@~1.0.10
RUN npm install -g random-string@~0.1.1
RUN npm install -g pg-copy-streams@~0.2.1
RUN npm install -g csv@~0.3.6
RUN npm install -g async@~0.9.0
RUN npm install -g postcode@~0.2.1
RUN npm install -g ospoint@~0.2.0
RUN npm install -g bunyan-syslog@~0.2.2
RUN npm install -g string@~1.9.0
RUN npm install -g cors@~2.4.1
ADD . /postcodes.io
RUN cd /postcodes.io && npm install -g
ENV NODE_ENV docker
WORKDIR /postcodes.io
CMD unzip ons.zip && importons `find /tmp/ons -type f -name ONS*.csv`
