import unittest,types,sys,json,importlib.util
class E(Exception): pass
class Return:
 def __init__(self,x): self.calldata=x
class Store(dict):
 @classmethod
 def __class_getitem__(cls,x): return cls
G=types.SimpleNamespace(Contract=object,public=types.SimpleNamespace(write=lambda f:f,view=lambda f:f),message=types.SimpleNamespace(sender_address='0x'+'1'*40),vm=types.SimpleNamespace(UserError=E,Return=Return),nondet=types.SimpleNamespace())
fake=types.ModuleType('genlayer');fake.__all__=['gl','TreeMap'];fake.gl=G;fake.TreeMap=Store;sys.modules['genlayer']=fake
spec=importlib.util.spec_from_file_location('forkseal','contracts/forkseal.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
RULE='Resolve YES if the report is published by March. Otherwise resolve NO. If cancelled, resolve VOID.'
CASES=[{'scenario':'The final report is published on the official website on March 1.','expected':'YES'},{'scenario':'The report is officially cancelled and never published by March.','expected':'VOID'}]
class Tests(unittest.TestCase):
 def setUp(self):
  G.message.sender_address='0x'+'1'*40;self.c=m.ForkSeal();self.answers=['YES','VOID'];self.prompts=[]
  def llm(prompt,**kwargs):
   self.prompts.append(prompt);return {'cases':[{'id':'C'+str(i+1),'actual':a,'quote':'Otherwise resolve NO.','reason':'An interpretation grounded in the fixed rule.'} for i,a in enumerate(self.answers)]}
  G.nondet.exec_prompt=llm
  def run(lead,check):
   value=lead();assert check(Return(value));return value
  G.vm.run_nondet_unsafe=run
 def run_test(self,i='one',parent='',rule=RULE,cs=CASES): return json.loads(self.c.test_rules(i,'Report question',rule,json.dumps(cs),parent))
 def test_pass_seal(self):
  r=self.run_test();self.assertEqual(r['state'],'PASSED');self.assertEqual(json.loads(self.c.seal('one',r['digest']))['state'],'SEALED')
 def test_mismatch_blocks_seal(self):
  self.answers=['YES','NO'];r=self.run_test();self.assertEqual(r['failed'],['C2'])
  with self.assertRaises(E):self.c.seal('one',r['digest'])
 def test_ambiguous_blocks(self):
  self.answers=['YES','AMBIGUOUS'];self.assertEqual(self.run_test()['state'],'BLOCKED')
 def test_wrong_digest(self):
  self.run_test()
  with self.assertRaises(E):self.c.seal('one','x')
 def test_other_signer_cannot_seal(self):
  r=self.run_test();G.message.sender_address='0x'+'2'*40
  with self.assertRaises(E):self.c.seal('one',r['digest'])
 def test_immutable(self):
  self.run_test()
  with self.assertRaises(E):self.run_test()
 def test_regression_preserves_suite(self):
  self.run_test();cs=[dict(c) for c in CASES];cs[0]['expected']='NO'
  with self.assertRaises(E):self.run_test('two','one',RULE+' Explicit deadline.',cs)
 def test_changes_recorded(self):
  self.answers=['YES','NO'];self.run_test();self.answers=['YES','VOID'];r=self.run_test('two','one',RULE+' An additional clarification.');self.assertEqual(r['changes'],[{'id':'C2','before':'NO','after':'VOID'}])
 def test_expected_not_in_prompt(self):
  self.run_test();self.assertNotIn('"expected"',self.prompts[0])
 def test_false_quote_rejected(self):
  with self.assertRaises(E):m.findings({'cases':[{'id':'C1','actual':'YES','quote':'forged quote','reason':'Some contextual explanation.'}]},[CASES[0]|{'id':'C1'}],RULE)
 def test_disagree_writes_nothing(self):
  def run(lead,check):
   v=lead();self.answers=['NO','VOID'];self.assertFalse(check(Return(v)));raise E('NO_AGREEMENT')
  G.vm.run_nondet_unsafe=run
  with self.assertRaises(E):self.run_test()
  self.assertEqual(len(self.c.records),0)
if __name__=='__main__': unittest.main()
