/* eslint-disable import/no-extraneous-dependencies */
import StateMachineWithGraph from '@andybalham/state-machine-with-graph';
import * as fs from 'fs';
import path from 'path';

export default function writeGraphJson(stateMachine: StateMachineWithGraph): void {
  //
  const stateMachinePath = path.join(__dirname, '..', '..', '.stateMachineASL');

  if (!fs.existsSync(stateMachinePath)) fs.mkdirSync(stateMachinePath);

  fs.writeFileSync(
    path.join(stateMachinePath, `${stateMachine.node.id}.asl.json`),
    stateMachine.graphJson
  );
}
