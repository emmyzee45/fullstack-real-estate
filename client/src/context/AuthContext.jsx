import { createContext, useEffect, useState } from "react";

export const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(
    JSON.parse(localStorage.getItem("user")) || null
  );

  const updateUser = (data) => {
    setCurrentUser(data);
  };

  useEffect(() => {
    localStorage.setItem("user", JSON.stringify(currentUser));
  }, [currentUser]);

  const isAdmin = currentUser?.role === "admin";
  const isAgent = currentUser?.role === "agent";
  const isCustomer = currentUser?.role === "customer";

  return (
    <AuthContext.Provider
      value={{ currentUser, updateUser, isAdmin, isAgent, isCustomer }}
    >
      {children}
    </AuthContext.Provider>
  );
};
