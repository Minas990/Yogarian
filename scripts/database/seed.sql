


INSERT INTO "user" (email, password, name, roles) VALUES
('alice@example.com', 'hashed_password_1', 'Alice', 'USER'),
('bob@example.com', 'hashed_password_2', 'Bob', 'USER'),
('charlie@example.com', 'hashed_password_3', 'Charlie', 'TRAINER'),
('diana@example.com', 'hashed_password_4', 'Diana', 'ADMIN'),
('eve@example.com', 'hashed_password_5', 'Eve', 'USER'),
('frank@example.com', 'hashed_password_6', 'Frank', 'TRAINER'),
('grace@example.com', 'hashed_password_7', 'Grace', 'USER');



INSERT INTO "follow" ("followingId", "followerId") VALUES
(2, 1),  
(3, 1);  


INSERT INTO "follow" ("followingId", "followerId") VALUES
(3, 2),  
(4, 2);  


INSERT INTO "follow" ("followingId", "followerId") VALUES
(4, 3),  
(5, 3);  


INSERT INTO "follow" ("followingId", "followerId") VALUES
(1, 4),  
(2, 4),  
(5, 4),  
(6, 4);  


INSERT INTO "follow" ("followingId", "followerId") VALUES
(2, 5),  
(6, 5);  
