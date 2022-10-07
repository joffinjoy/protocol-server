FROM node:16

#Set working directory
WORKDIR /var/

#Copy package.json file
COPY ./package.json .

#Install node packages
RUN npm install && npm install -g nodemon@2.0.16
#Copy all files 
COPY ./ .

#Expose the application port
EXPOSE 5000

#Start the application
CMD [ "nodemon", "src/app.ts" ]
