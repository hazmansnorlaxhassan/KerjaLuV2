-- Create Database if not exists
CREATE DATABASE IF NOT EXISTS kerjalu_db;
USE kerjalu_db;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('jobseeker', 'employer', 'admin') NOT NULL,
  status ENUM('active', 'suspended') DEFAULT 'active',
  latitude DECIMAL(10, 8) NULL,
  longitude DECIMAL(11, 8) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Jobs Table (Posted by Employers)
CREATE TABLE IF NOT EXISTS jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employer_id INT NOT NULL,
  title VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  budget DECIMAL(10, 2) NOT NULL,
  category VARCHAR(50) NOT NULL,
  status ENUM('open', 'closed') DEFAULT 'open',
  latitude DECIMAL(10, 8) NULL,
  longitude DECIMAL(11, 8) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Job Applications Table (Jobseekers applying for jobs)
CREATE TABLE IF NOT EXISTS job_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_id INT NOT NULL,
  jobseeker_id INT NOT NULL,
  proposal TEXT NOT NULL,
  bid_amount DECIMAL(10, 2) NOT NULL,
  status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (jobseeker_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Gigs Table (Freelance services offered by Jobseekers)
CREATE TABLE IF NOT EXISTS gigs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  jobseeker_id INT NOT NULL,
  title VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  delivery_days INT NOT NULL,
  category VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (jobseeker_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Orders Table (Gig purchases)
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  gig_id INT NOT NULL,
  buyer_id INT NOT NULL,
  seller_id INT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gig_id) REFERENCES gigs(id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Seed Initial Users (Passwords are bcrypt hashed for 'password123')
-- Hash: $2a$10$h6iDuW4LafCmbAcqGSSJMOX4fAlxbDCW8niOavfyw3KHF/vZEy0ue
-- Note: 'password123'
-- Coordinates based around Kota Kinabalu, Sabah (KK Center, Alam Mesra, UMS, Likas)
INSERT INTO users (id, username, email, password, role, status, latitude, longitude) VALUES
(1, 'system_admin', 'admin@kerjalu.com', '$2a$10$h6iDuW4LafCmbAcqGSSJMOX4fAlxbDCW8niOavfyw3KHF/vZEy0ue', 'admin', 'active', 5.98040000, 116.07350000),
(2, 'john_employer', 'john@employer.com', '$2a$10$h6iDuW4LafCmbAcqGSSJMOX4fAlxbDCW8niOavfyw3KHF/vZEy0ue', 'employer', 'active', 6.03360000, 116.12140000),
(3, 'jane_jobseeker', 'jane@jobseeker.com', '$2a$10$h6iDuW4LafCmbAcqGSSJMOX4fAlxbDCW8niOavfyw3KHF/vZEy0ue', 'jobseeker', 'active', 6.03670000, 116.11850000),
(4, 'bob_jobseeker', 'bob@jobseeker.com', '$2a$10$h6iDuW4LafCmbAcqGSSJMOX4fAlxbDCW8niOavfyw3KHF/vZEy0ue', 'jobseeker', 'active', 5.98970000, 116.09680000);

-- Seed Sample Gigs (Freelance services offered by Jobseekers)
INSERT INTO gigs (id, jobseeker_id, title, description, price, delivery_days, category) VALUES
(1, 3, 'Create high converting landing page', 'I will create a responsive landing page using modern HTML, CSS, and JS with animations.', 150.00, 3, 'Web Development'),
(2, 3, 'Design UI/UX Mockups', 'Professional mobile and web layouts in Figma. Source file included.', 80.00, 2, 'Design'),
(3, 4, 'Write SEO Optimized Articles', 'Quality articles and blogs tailored to your niche. Word limit up to 1500 words.', 50.00, 1, 'Writing');

-- Seed Sample Jobs (Posted by Employers)
INSERT INTO jobs (id, employer_id, title, description, budget, category, status, latitude, longitude) VALUES
(1, 2, 'Build an Express MySQL Backend API', 'Need a developer to design and write Express API endpoints for a booking website. Must include authentication.', 300.00, 'Web Development', 'open', 6.03360000, 116.12140000),
(2, 2, 'Logo Design for Tech Startup', 'Looking for a minimalist, modern logo design for a software business. Delivery format: SVG, PNG.', 75.00, 'Design', 'open', 6.03000000, 116.13000000);

-- Seed Sample Job Applications
INSERT INTO job_applications (id, job_id, jobseeker_id, proposal, bid_amount, status) VALUES
(1, 1, 3, 'I have 3 years of Express and MySQL experience. I can deliver a clean, well-documented API within 5 days.', 280.00, 'pending'),
(2, 2, 4, 'I can design a premium vector logo for you. I will provide 3 initial concepts for selection.', 70.00, 'pending');

-- Seed Sample Orders (Employers buying Gigs)
INSERT INTO orders (id, gig_id, buyer_id, seller_id, price, status) VALUES
(1, 1, 2, 3, 150.00, 'in_progress');
