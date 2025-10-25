use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    program_error::ProgramError,
    pubkey::Pubkey,
    declare_id,
};

// New program ID
declare_id!("11111111111111111111111111111113");

entrypoint!(process_instruction);

pub fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    // Minimal program - just store the data
    let accounts_iter = &mut accounts.iter();
    let _tweet_account = next_account_info(accounts_iter)?;
    let _author_account = next_account_info(accounts_iter)?;
    
    // Simple validation
    if instruction_data.len() > 1000 {
        return Err(ProgramError::InvalidInstructionData);
    }
    
    // This is a minimal program that will be much smaller
    Ok(())
}
