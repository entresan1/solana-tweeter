const fs = require('fs');

// Check if we have the old program binary
if (fs.existsSync('program.so')) {
    const stats = fs.statSync('program.so');
    console.log('Old program size:', stats.size, 'bytes');
    console.log('Old program size:', (stats.size / 1024).toFixed(2), 'KB');
}

// Create a minimal test program
const minimalProgram = `
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    program_error::ProgramError,
    pubkey::Pubkey,
    declare_id,
};

declare_id!("11111111111111111111111111111112");

entrypoint!(process_instruction);

pub fn process_instruction(
    _program_id: &Pubkey,
    _accounts: &[AccountInfo],
    _instruction_data: &[u8],
) -> ProgramResult {
    Ok(())
}
`;

fs.writeFileSync('minimal_program.rs', minimalProgram);
console.log('Created minimal program for testing');
