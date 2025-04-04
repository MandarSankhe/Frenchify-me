// index.js
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min";
import { ApolloProvider, ApolloClient, InMemoryCache } from "@apollo/client";
import { createUploadLink } from 'apollo-upload-client'; // For handling file uploads

const graphqlUri = `${process.env.REACT_APP_API_URL || "http://localhost:4000"}/graphql`;

const uploadLink = createUploadLink({
  uri: graphqlUri,
});

const client = new ApolloClient({
  link: uploadLink,
  cache: new InMemoryCache(),
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>
);
