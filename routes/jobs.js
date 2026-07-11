const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireRole } = require('../auth-middleware');

// 1. Get all open jobs (Jobseekers or Employers searching)
router.get('/', authenticateToken, async (req, res) => {
  const { category, search } = req.query;
  let sql = `
    SELECT j.*, u.username AS employer_name 
    FROM jobs j 
    JOIN users u ON j.employer_id = u.id 
    WHERE j.status = 'open'
  `;
  const params = [];

  if (category) {
    sql += ' AND j.category = ?';
    params.push(category);
  }

  if (search) {
    sql += ' AND (j.title LIKE ? OR j.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY j.created_at DESC';

  try {
    const [jobs] = await db.query(sql, params);
    res.json(jobs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to retrieve jobs.' });
  }
});

// 2. Post a job (Employer only)
router.post('/', authenticateToken, requireRole('employer'), async (req, res) => {
  const { title, description, budget, category, latitude, longitude } = req.body;

  if (!title || !description || !budget || !category) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    await db.query(
      'INSERT INTO jobs (employer_id, title, description, budget, category, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, title, description, budget, category, latitude || null, longitude || null]
    );
    res.status(201).json({ message: 'Job posted successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to post job.' });
  }
});

// 2b. Update a job (Employer only)
router.put('/:id', authenticateToken, requireRole('employer'), async (req, res) => {
  const jobId = req.params.id;
  const { title, description, budget, category, latitude, longitude } = req.body;

  if (!title || !description || !budget || !category) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    const [existing] = await db.query('SELECT * FROM jobs WHERE id = ? AND employer_id = ?', [jobId, req.user.id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Job listing not found or unauthorized.' });
    }

    await db.query(
      'UPDATE jobs SET title = ?, description = ?, budget = ?, category = ?, latitude = ?, longitude = ? WHERE id = ? AND employer_id = ?',
      [title, description, budget, category, latitude || null, longitude || null, jobId, req.user.id]
    );
    res.json({ message: 'Job updated successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update job.' });
  }
});

// 2c. Close a job (Employer only)
router.put('/:id/close', authenticateToken, requireRole('employer'), async (req, res) => {
  const jobId = req.params.id;
  try {
    const [existing] = await db.query('SELECT * FROM jobs WHERE id = ? AND employer_id = ?', [jobId, req.user.id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Job listing not found or unauthorized.' });
    }
    await db.query('UPDATE jobs SET status = "closed" WHERE id = ?', [jobId]);
    res.json({ message: 'Job closed successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to close job.' });
  }
});

// 2d. Delete a job (Employer only)
router.delete('/:id', authenticateToken, requireRole('employer'), async (req, res) => {
  const jobId = req.params.id;
  try {
    const [existing] = await db.query('SELECT * FROM jobs WHERE id = ? AND employer_id = ?', [jobId, req.user.id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Job listing not found or unauthorized.' });
    }
    await db.query('DELETE FROM jobs WHERE id = ?', [jobId]);
    res.json({ message: 'Job posting deleted successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete job.' });
  }
});

// 3. Get jobs posted by current Employer
router.get('/my-jobs', authenticateToken, requireRole('employer'), async (req, res) => {
  try {
    const [jobs] = await db.query(
      `SELECT j.*, COUNT(ja.id) AS applicants_count 
       FROM jobs j 
       LEFT JOIN job_applications ja ON j.id = ja.job_id 
       WHERE j.employer_id = ? 
       GROUP BY j.id 
       ORDER BY j.created_at DESC`,
      [req.user.id]
    );
    res.json(jobs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to retrieve your jobs.' });
  }
});

// Get jobs based on proximity (Haversine formula)
router.get('/proximity', authenticateToken, async (req, res) => {
  let lat = req.query.lat ? parseFloat(req.query.lat) : req.user.latitude;
  let lng = req.query.lng ? parseFloat(req.query.lng) : req.user.longitude;
  const radius = req.query.radius ? parseFloat(req.query.radius) : 10; // default 10 km
  const { category, search } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ message: 'Location coordinate parameters (lat, lng) are required.' });
  }

  const params = [lat, lng, lat];
  let sql = `
    SELECT j.*, u.username AS employer_name,
      (6371 * acos(cos(radians(?)) * cos(radians(j.latitude)) * cos(radians(j.longitude) - radians(?)) + sin(radians(?)) * sin(radians(j.latitude)))) AS distance
    FROM jobs j
    JOIN users u ON j.employer_id = u.id
    WHERE j.status = 'open'
  `;

  if (category) {
    sql += ' AND j.category = ?';
    params.push(category);
  }

  if (search) {
    sql += ' AND (j.title LIKE ? OR j.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ' HAVING distance <= ? ORDER BY distance ASC';
  params.push(radius);

  try {
    const [jobs] = await db.query(sql, params);
    res.json(jobs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to retrieve jobs by proximity.' });
  }
});

// 4. Get applications for a specific job (Employer only - must own the job)
router.get('/:id/applications', authenticateToken, requireRole('employer'), async (req, res) => {
  const jobId = req.params.id;

  try {
    // Verify job ownership
    const [jobs] = await db.query('SELECT employer_id FROM jobs WHERE id = ?', [jobId]);
    if (jobs.length === 0) {
      return res.status(404).json({ message: 'Job not found.' });
    }
    if (jobs[0].employer_id !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized. You do not own this job posting.' });
    }

    // Get applications
    const [applications] = await db.query(
      `SELECT ja.*, u.username AS applicant_name, u.email AS applicant_email 
       FROM job_applications ja 
       JOIN users u ON ja.jobseeker_id = u.id 
       WHERE ja.job_id = ? 
       ORDER BY ja.created_at DESC`,
      [jobId]
    );
    res.json(applications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to retrieve applications.' });
  }
});

// 5. Apply for a job (Jobseeker only)
router.post('/:id/apply', authenticateToken, requireRole('jobseeker'), async (req, res) => {
  const jobId = req.params.id;
  const { proposal, bid_amount } = req.body;

  if (!proposal || !bid_amount) {
    return res.status(400).json({ message: 'Proposal and bid amount are required.' });
  }

  try {
    // Check if job exists and is open
    const [jobs] = await db.query('SELECT status FROM jobs WHERE id = ?', [jobId]);
    if (jobs.length === 0) {
      return res.status(404).json({ message: 'Job not found.' });
    }
    if (jobs[0].status !== 'open') {
      return res.status(400).json({ message: 'Job posting is closed.' });
    }

    // Check if already applied
    const [existing] = await db.query(
      'SELECT id FROM job_applications WHERE job_id = ? AND jobseeker_id = ?',
      [jobId, req.user.id]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: 'You have already applied for this job.' });
    }

    // Submit application
    await db.query(
      'INSERT INTO job_applications (job_id, jobseeker_id, proposal, bid_amount) VALUES (?, ?, ?, ?)',
      [jobId, req.user.id, proposal, bid_amount]
    );

    res.status(201).json({ message: 'Application submitted successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to submit application.' });
  }
});

// 6. Update application status (Employer only)
router.post('/applications/:id/status', authenticateToken, requireRole('employer'), async (req, res) => {
  const applicationId = req.params.id;
  const { status } = req.body; // 'accepted' or 'rejected'

  if (!['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status update. Must be accepted or rejected.' });
  }

  try {
    // Verify that the employer owns the job of this application
    const [applications] = await db.query(
      `SELECT ja.*, j.employer_id, j.id AS job_id 
       FROM job_applications ja 
       JOIN jobs j ON ja.job_id = j.id 
       WHERE ja.id = ?`,
      [applicationId]
    );

    if (applications.length === 0) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    const application = applications[0];
    if (application.employer_id !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized. You do not own the job posting for this application.' });
    }

    // Update status
    await db.query('UPDATE job_applications SET status = ? WHERE id = ?', [status, applicationId]);

    // If accepted, set job status to closed
    if (status === 'accepted') {
      await db.query('UPDATE jobs SET status = \'closed\' WHERE id = ?', [application.job_id]);
      // Reject all other applications for this job automatically
      await db.query(
        'UPDATE job_applications SET status = \'rejected\' WHERE job_id = ? AND id != ?',
        [application.job_id, applicationId]
      );
    }

    res.json({ message: `Application ${status} successfully.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update application status.' });
  }
});

// 7. Get applications of current Jobseeker
router.get('/my-applications', authenticateToken, requireRole('jobseeker'), async (req, res) => {
  try {
    const [applications] = await db.query(
      `SELECT ja.*, j.title AS job_title, j.budget AS job_budget, u.username AS employer_name 
       FROM job_applications ja 
       JOIN jobs j ON ja.job_id = j.id 
       JOIN users u ON j.employer_id = u.id 
       WHERE ja.jobseeker_id = ? 
       ORDER BY ja.created_at DESC`,
      [req.user.id]
    );
    res.json(applications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to retrieve your applications.' });
  }
});

module.exports = router;
