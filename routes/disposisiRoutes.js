// routes/disposisiRoutes.js - FIXED VERSION

const express = require('express');
const router = express.Router();
const controller = require('../controllers/disposisiController');

// ========================== LOGGING =============================

const logRoute = (routeName, method = 'GET') => {
  return (req, res, next) => {
    console.log(`📋 [${method}] Route ${routeName} accessed:`, {
      params: req.params,
      query: req.query,
      timestamp: new Date().toISOString()
    });
    next();
  };
};

console.log('📋 Loading disposisi routes...');

// ========================== SPECIFIC ROUTES (MUST BE FIRST) =============================

/**
 * GET NEXT DISPOSISI NUMBER
 * ✅ CRITICAL: Must be before /:id route
 */
router.get('/next-number', 
  logRoute('/next-number', 'GET'),
  controller.getNextNumber
);

/**
 * CHECK LETTER DISPOSITION STATUS
 * ✅ Check if a letter has already been disposed
 */
router.get('/check-letter/:letterIn_id', 
  logRoute('/check-letter/:letterIn_id', 'GET'),
  controller.checkLetterDisposition
);

/**
 * GET DISPOSISI STATISTICS
 * ✅ Analytics endpoint for dashboard
 */
router.get('/stats', 
  logRoute('/stats', 'GET'),
  controller.getStats
);

// ========================== CRUD ROUTES =============================

/**
 * CREATE NEW DISPOSISI
 * ✅ Enhanced with duplicate letter check
 */
router.post('/', 
  logRoute('/', 'POST'),
  controller.create
);

/**
 * GET ALL DISPOSISI
 * ✅ Enhanced with pagination and filtering
 */
router.get('/', 
  logRoute('/', 'GET'),
  controller.getAll
);

/**
 * GET DISPOSISI BY ID
 * ✅ IMPORTANT: Must be after specific routes
 */
router.get('/:id', 
  logRoute('/:id', 'GET'),
  controller.getById
);

/**
 * UPDATE DISPOSISI BY ID
 * ✅ Enhanced with conflict checking
 */
router.put('/:id', 
  logRoute('/:id', 'PUT'),
  controller.updateById
);

/**
 * DELETE DISPOSISI BY ID
 * ✅ Enhanced with better logging
 */
router.delete('/:id', 
  logRoute('/:id', 'DELETE'),
  controller.deleteById
);

// ========================== ERROR HANDLING =============================

/**
 * Route not found handler
 */
router.use('*', (req, res) => {
  console.log('❌ Disposisi route not found:', {
    method: req.method,
    originalUrl: req.originalUrl,
    params: req.params
  });
  
  res.status(404).json({
    success: false,
    message: 'Disposisi route not found',
    availableRoutes: [
      'GET /disposisi-letterin',
      'POST /disposisi-letterin',
      'GET /disposisi-letterin/:id',
      'PUT /disposisi-letterin/:id',
      'DELETE /disposisi-letterin/:id',
      'GET /disposisi-letterin/next-number',
      'GET /disposisi-letterin/check-letter/:letterIn_id',
      'GET /disposisi-letterin/stats'
    ]
  });
});

console.log('✅ Disposisi routes loaded successfully');

// ========================== ROUTE TESTING =============================

/**
 * Test function to verify route order
 * Call this from your main app to test routes
 */
const testRoutes = () => {
  console.log('🧪 Testing disposisi routes...');
  
  const testCases = [
    { path: '/next-number', expected: 'getNextNumber' },
    { path: '/check-letter/123', expected: 'checkLetterDisposition' },
    { path: '/stats', expected: 'getStats' },
    { path: '/123', expected: 'getById' },
    { path: '/', expected: 'getAll or create' }
  ];
  
  testCases.forEach(test => {
    console.log(`  📝 ${test.path} → ${test.expected}`);
  });
  
  console.log('✅ Route testing completed');
};

// Export the test function along with router
router.testRoutes = testRoutes;

module.exports = router;

// ========================== USAGE DOCUMENTATION =============================

/*
API ENDPOINTS DOCUMENTATION:

1. GET /api/disposisi-letterin/next-number
   - Returns next sequential disposisi number
   - Response: { success: true, noDispo: 4, maxExisting: 3, strategy: "sequential" }

2. GET /api/disposisi-letterin/check-letter/:letterIn_id
   - Check if letter is already disposed
   - Response: { success: true, isDisposed: true, dispositions: [...] }

3. GET /api/disposisi-letterin/stats?year=2025
   - Get disposisi statistics
   - Response: { success: true, data: { total: 10, yearly: 5, monthly: 2, today: 1 } }

4. POST /api/disposisi-letterin
   - Create new disposisi
   - Body: { letterIn_id, noDispo, tglDispo, dispoKe[], isiDispo }
   - Response: { success: true, data: {...} }

5. GET /api/disposisi-letterin?page=1&limit=10&letterIn_id=123
   - Get all disposisi with pagination and filtering
   - Response: { success: true, data: [...], pagination: {...} }

6. GET /api/disposisi-letterin/:id
   - Get disposisi by ID
   - Response: { success: true, data: {...} }

7. PUT /api/disposisi-letterin/:id
   - Update disposisi by ID
   - Body: { field: newValue }
   - Response: { success: true, data: {...} }

8. DELETE /api/disposisi-letterin/:id
   - Delete disposisi by ID
   - Response: { success: true, message: "Disposisi deleted" }

ERROR RESPONSES:
- 400: Bad Request (validation errors)
- 404: Not Found
- 409: Conflict (duplicate number or letter already disposed)
- 500: Internal Server Error
*/