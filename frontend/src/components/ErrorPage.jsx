import React from 'react';
import Navbar from './Navbar'; 
import { Link } from 'react-router-dom';


const ErrorPage = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <section className="flex justify-center items-center flex-grow bg-gray-100">
        <div className="text-center p-4 bg-white rounded-lg shadow-lg max-w-lg w-full">
          <figure>
          
            <img
              src="../error-page.gif"
              alt="404-error"
              className="mx-auto mb-4"
            />
          </figure>
          <div>
            <p className="text-lg text-gray-700 mb-4">
              The page you are looking for does not exist
            </p>
            <p className="text-sm">
  <Link
    to="/"
  >
    Back to home page
  </Link>
</p>

          </div>
        </div>
      </section>
    </div>
  );
};

export default ErrorPage;
