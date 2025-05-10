document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const resultsDiv = document.getElementById('results');
    const lastUsedIdInput = document.getElementById('lastUsedId');
    const copyIdBtn = document.getElementById('copyIdBtn');
    
    // Track the last used ID
    let lastUsedId = '';
    
    // Helper function to update the last used ID
    function updateLastUsedId(id) {
        if (id) {
            lastUsedId = id;
            lastUsedIdInput.value = id;
        }
    }
    
    // Copy ID button functionality (kept for potential programmatic use)
    copyIdBtn.addEventListener('click', () => {
        if (lastUsedId) {
            navigator.clipboard.writeText(lastUsedId)
                .then(() => {
                    console.log('ID copied to clipboard');
                })
                .catch(err => {
                    console.error('Failed to copy: ', err);
                });
        }
    });
    
    // Helper function to display results
    function displayResults(data) {
        resultsDiv.textContent = JSON.stringify(data, null, 2);
        
        // Extract and update the last used ID if available
        if (data.insertedId) {
            updateLastUsedId(data.insertedId);
        } else if (data.document && data.document._id) {
            updateLastUsedId(data.document._id);
        } else if (data.documents && data.documents.length > 0 && data.documents[0]._id) {
            updateLastUsedId(data.documents[0]._id);
        } else if (data.result && data.result._id) {
            updateLastUsedId(data.result._id);
        }
    }
    
    // Helper function for API calls
    async function apiCall(endpoint, data = {}, method = 'POST') {
        try {
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            
            if (method !== 'GET') {
                options.body = JSON.stringify(data);
            }
            
            const response = await fetch(`/api/${endpoint}`, options);
            const result = await response.json();
            
            displayResults(result);
            return result;
        } catch (error) {
            displayResults({ error: error.message });
            console.error('API call error:', error);
        }
    }
    
    // 1. insertOne - Insert a single document
    document.getElementById('insertOneBtn').addEventListener('click', async () => {
        const name = document.getElementById('itemName').value.trim();
        const category = document.getElementById('itemCategory').value.trim();
        const price = parseFloat(document.getElementById('itemPrice').value);
        const inStock = document.getElementById('itemInStock').checked;
        
        if (!name) {
            displayResults({ error: 'Name is required' });
            return;
        }
        
        const item = {
            name,
            category: category || 'Uncategorized',
            price: isNaN(price) ? 0 : price,
            inStock,
            createdAt: new Date()
        };
        
        await apiCall('insertOne', item);
    });
    
    // 2. insertMany - Insert multiple documents
    document.getElementById('insertManyBtn').addEventListener('click', async () => {
        // Sample items for demonstration
        const items = [
            { name: 'Sample Item 1', category: 'Sample', price: 10, inStock: true, createdAt: new Date() },
            { name: 'Sample Item 2', category: 'Sample', price: 20, inStock: true, createdAt: new Date() },
            { name: 'Sample Item 3', category: 'Sample', price: 30, inStock: false, createdAt: new Date() }
        ];
        
        await apiCall('insertMany', items);
    });
    
    // 3. find - Find all documents
    document.getElementById('findAllBtn').addEventListener('click', async () => {
        await apiCall('find', { query: {} });
    });
    
    // 4. findOne - Find the first document matching a query
    document.getElementById('findOneBtn').addEventListener('click', async () => {
    const itemId = document.getElementById('findOneItemId').value.trim();
    
    // Basic validation for MongoDB ObjectId format
    if (itemId && !/^[0-9a-fA-F]{24}$/.test(itemId)) {
        displayResults({ 
            error: 'Invalid ID format. MongoDB ObjectIds must be 24 hexadecimal characters.' 
        });
        return;
    }
    
    const query = itemId ? { _id: itemId } : {};
    await apiCall('findOne', { query });
});
    
    // 5. find().limit() - Limit the number of documents
    document.getElementById('limitBtn').addEventListener('click', async () => {
        await apiCall('find', { 
            query: {}, 
            options: { limit: 3 } 
        });
    });
    
    // 6. find().skip() - Skip a number of documents (pagination)
    document.getElementById('skipBtn').addEventListener('click', async () => {
        await apiCall('find', { 
            query: {}, 
            options: { skip: 2 } 
        });
    });
    
    // 7. find().sort() - Sort query results
    document.getElementById('sortByPriceBtn').addEventListener('click', async () => {
        await apiCall('find', { 
            query: {}, 
            options: { sort: { price: -1 } } 
        });
    });
    
    // 8. distinct - Return distinct values for a field
    document.getElementById('distinctCategoriesBtn').addEventListener('click', async () => {
        await apiCall('distinct', { field: 'category' });
    });
    
    // 9. countDocuments - Count the number of matching documents
    document.getElementById('countDocumentsBtn').addEventListener('click', async () => {
        await apiCall('countDocuments', { query: {} });
    });
    
    // 10. updateOne - Update the first matching document
    document.getElementById('updateOneBtn').addEventListener('click', async () => {
    const itemId = document.getElementById('itemId').value.trim();
    const newName = document.getElementById('newName').value.trim();
    const newPrice = parseFloat(document.getElementById('newPrice').value);
    
    if (!itemId) {
        displayResults({ error: 'Item ID is required' });
        return;
    }
    
    // Validate MongoDB ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(itemId)) {
        displayResults({ 
            error: 'Invalid ID format. MongoDB ObjectIds must be 24 hexadecimal characters.'
        });
        return;
    }
    
    const update = { $set: {} };
    
    if (newName) {
        update.$set.name = newName;
    }
    
    if (!isNaN(newPrice)) {
        update.$set.price = newPrice;
    }
    
    if (Object.keys(update.$set).length === 0) {
        displayResults({ error: 'No update values provided' });
        return;
    }
    
    await apiCall('updateOne', {
        filter: { _id: itemId },
        update
    });
});
    
    // 11. updateMany - Update multiple matching documents
    document.getElementById('updateManyBtn').addEventListener('click', async () => {
        // Update all items with price < 50 to be not in stock
        await apiCall('updateMany', {
            filter: { price: { $lt: 50 } },
            update: { $set: { inStock: false } }
        });
    });
    
    // 12. replaceOne - Replace an entire document
    document.getElementById('replaceOneBtn').addEventListener('click', async () => {
        const itemId = document.getElementById('replaceItemId').value.trim();
        
        if (!itemId) {
            displayResults({ error: 'Item ID is required' });
            return;
        }
        
        // Replace with a completely new document structure
        await apiCall('replaceOne', {
            filter: { _id: itemId },
            replacement: {
                name: 'Replaced Item',
                category: 'Replaced',
                price: 999,
                inStock: true,
                replacedAt: new Date()
            }
        });
    });
    
    // 13. deleteOne - Delete a single document
    document.getElementById('deleteOneBtn').addEventListener('click', async () => {
    const itemId = document.getElementById('itemId').value.trim();
    
    if (!itemId) {
        displayResults({ error: 'Item ID is required' });
        return;
    }
    
    // Validate MongoDB ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(itemId)) {
        displayResults({ 
            error: 'Invalid ID format. MongoDB ObjectIds must be 24 hexadecimal characters.'
        });
        return;
    }
    
    await apiCall('deleteOne', { filter: { _id: itemId } });
});
    
    // 14. deleteMany - Delete multiple documents
    document.getElementById('deleteManyBtn').addEventListener('click', async () => {
        // Delete all items that are not in stock
        await apiCall('deleteMany', { filter: { inStock: false } });
    });
    
    // 15. aggregate - Group by category
    document.getElementById('groupByCategoryBtn').addEventListener('click', async () => {
        await apiCall('aggregate', {
            pipeline: [
                { $group: { _id: "$category", count: { $sum: 1 }, avgPrice: { $avg: "$price" } } }
            ]
        });
    });
    
    // 15b. aggregate - Match price > 100
    document.getElementById('matchPriceBtn').addEventListener('click', async () => {
        await apiCall('aggregate', {
            pipeline: [
                { $match: { price: { $gt: 100 } } },
                { $project: { _id: 1, name: 1, price: 1 } }
            ]
        });
    });
    
    // 15c. aggregate - Project name & price
    document.getElementById('projectBtn').addEventListener('click', async () => {
        await apiCall('aggregate', {
            pipeline: [
                { $project: { _id: 0, name: 1, price: 1 } }
            ]
        });
    });
    
    // 16. createIndex - Create an index
    document.getElementById('createIndexBtn').addEventListener('click', async () => {
        await apiCall('createIndex', {
            keys: { category: 1 },
            options: { name: 'category_index' }
        });
    });
    
    // 17. dropIndex - Drop an index
    document.getElementById('dropIndexBtn').addEventListener('click', async () => {
        await apiCall('dropIndex', { indexName: 'category_index' });
    });
    
    // 18. getIndexes - List all indexes
    document.getElementById('getIndexesBtn').addEventListener('click', async () => {
        await apiCall('getIndexes', {}, 'GET');
    });
    
    // 19. findOneAndUpdate - Find and update a document atomically
    document.getElementById('findOneAndUpdateBtn').addEventListener('click', async () => {
    const itemId = document.getElementById('findUpdateItemId').value.trim();
    const newName = document.getElementById('findUpdateNewName').value.trim();
    
    if (!itemId) {
        displayResults({ error: 'Item ID is required' });
        return;
    }
    
    // Validate MongoDB ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(itemId)) {
        displayResults({ 
            error: 'Invalid ID format. MongoDB ObjectIds must be 24 hexadecimal characters.'
        });
        return;
    }
    
    const update = { $set: { lastUpdated: new Date() } };
    if (newName) {
        update.$set.name = newName;
    }
    
    await apiCall('findOneAndUpdate', {
        filter: { _id: itemId },
        update,
        options: { returnDocument: 'after' }
    });
});
    // 20. findOneAndDelete - Find and delete a document
    document.getElementById('findOneAndDeleteBtn').addEventListener('click', async () => {
    const itemId = document.getElementById('findDeleteItemId').value.trim();
    
    if (!itemId) {
        displayResults({ error: 'Item ID is required' });
        return;
    }
    
    // Validate MongoDB ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(itemId)) {
        displayResults({ 
            error: 'Invalid ID format. MongoDB ObjectIds must be 24 hexadecimal characters.'
        });
        return;
    }
    
    await apiCall('findOneAndDelete', {
        filter: { _id: itemId }
    });
});
    
    // 21. bulkWrite - Perform bulk write operations
    document.getElementById('bulkWriteBtn').addEventListener('click', async () => {
        // Sample bulk operations for demonstration
        await apiCall('bulkWrite', {
            operations: [
                { 
                    insertOne: { 
                        document: { 
                            name: 'Bulk Insert Item', 
                            category: 'Bulk', 
                            price: 50, 
                            inStock: true,
                            createdAt: new Date()
                        } 
                    } 
                },
                { 
                    updateOne: { 
                        filter: { category: 'Sample' },
                        update: { $set: { bulkUpdated: true } } 
                    } 
                },
                { 
                    deleteOne: { 
                        filter: { price: { $lt: 10 } } 
                    } 
                }
            ]
        });
    });
    
    // 22. findOneAndReplace - Find and replace a document
    document.getElementById('findOneAndReplaceBtn').addEventListener('click', async () => {
    const itemId = document.getElementById('findReplaceItemId').value.trim();
    
    if (!itemId) {
        displayResults({ error: 'Item ID is required' });
        return;
    }
    
    // Validate MongoDB ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(itemId)) {
        displayResults({ 
            error: 'Invalid ID format. MongoDB ObjectIds must be 24 hexadecimal characters.'
        });
        return;
    }
    
    await apiCall('findOneAndReplace', {
        filter: { _id: itemId },
        replacement: {
            name: 'Atomic Replaced Item',
            category: 'Atomic',
            price: 888,
            inStock: true,
            replacedAt: new Date()
        },
        options: { returnDocument: 'after' }
    });
});

    
    // 23. renameCollection - Rename a collection
    document.getElementById('renameCollectionBtn').addEventListener('click', async () => {
        // First rename to temp_items, then back to items to demonstrate the operation
        const result = await apiCall('renameCollection', { newName: 'temp_items' });
        
        if (result.success) {
            setTimeout(async () => {
                await apiCall('renameCollection', { newName: 'items' });
            }, 2000);
        }
    });
    
    // 24. drop - Drop an entire collection
    document.getElementById('dropCollectionBtn').addEventListener('click', async () => {
        if (confirm('Are you sure you want to drop the entire collection? This action cannot be undone.')) {
            await apiCall('drop', {});
        }
    });
    
    // 25. listCollections - List all collections in the database
    document.getElementById('listCollectionsBtn').addEventListener('click', async () => {
        await apiCall('listCollections', {}, 'GET');
    });
});