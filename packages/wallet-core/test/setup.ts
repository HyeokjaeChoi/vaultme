import fc from 'fast-check'

// FC_SEED fixes the seed of every fast-check property (the mutation job sets it, so a mutant is killed the same way on every run).
// Unset = a new seed each run.
if (process.env.FC_SEED) fc.configureGlobal({ seed: Number(process.env.FC_SEED) })
