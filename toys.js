// Availability is intentionally separate from toy geometry and interaction.
// Both toys are included today. A future native StoreKit entitlement can gate
// selection here; localStorage is a preference, never proof of purchase.
export const toys = Object.freeze({
  cheese: Object.freeze({id:'cheese', name:'Cheese', label:'Cheese squishy', entitlement:null}),
  pearl: Object.freeze({id:'pearl', name:'Pearl', label:'Pearl coconut oil squishy', entitlement:'pearl-coconut-oil', included:true})
});
export function toyFor(id) { return Object.prototype.hasOwnProperty.call(toys,id) ? toys[id] : toys.cheese; }
