/** Decimal units match the configured 200,000,000-byte = 200 MB allowance. */
export function formatStorage(value:string|null){
 if(value===null)return 'Not configured';const bytes=BigInt(value);if(bytes<1000n)return `${bytes} ${bytes===1n?'byte':'bytes'}`;
 for(const [unit,divisor] of [['GB',1000000000n],['MB',1000000n],['KB',1000n]] as const)if(bytes>=divisor){const tenths=(bytes*10n+divisor/2n)/divisor;return `${tenths/10n}${tenths%10n?'.'+tenths%10n:''} ${unit}`;}
 return '0 bytes';
}
