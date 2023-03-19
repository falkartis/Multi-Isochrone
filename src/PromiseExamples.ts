// function recursiveFunction(param: number): Promise<number> {
// 	return new Promise((resolve, reject) => {
// 		// Base case
// 		if (param === 0) {
// 			resolve(0);
// 		} else {
// 			// Perform asynchronous operation
// 			someAsyncOperation(param).then((result) => {
// 				// Call recursive function with new parameter
// 				recursiveFunction(result - 1).then((subResult) => {
// 					// Combine result of recursive call with current result
// 					resolve(subResult + result);
// 				}).catch((error) => {
// 					reject(error);
// 				});
// 			}).catch((error) => {
// 				reject(error);
// 			});
// 		}
// 	});
// }


// async function recursiveFunction(param: number): Promise<number> {
// 	// Base case
// 	if (param === 0) {
// 		return 0;
// 	} else {
// 		// Perform asynchronous operation
// 		const result = await someAsyncOperation(param);
// 		// Call recursive function with new parameter
// 		const subResult = await recursiveFunction(result - 1);
// 		// Combine result of recursive call with current result
// 		return subResult + result;
// 	}
// }
