export default class TestObservation {
  //
  observerId: string;

  timestamp: number;

  data: any;

  static getCountById(observations: TestObservation[], observerId: string): number {
    return TestObservation.filterById(observations, observerId).length;
  }

  static filterById(observations: TestObservation[], observerId: string): TestObservation[] {
    return observations.filter((o) => o.observerId === observerId);
  }

  static consoleLogAll(observations: TestObservation[]): void {
    observations.forEach((observation) => {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify({ o: observation }, null, 2));
    });
  }

  static getEventRecords<TEvent extends { Records: TEventRecord[] }, TEventRecord>(
    observations: TestObservation[]
  ): TEventRecord[] {
    const eventRecords = observations
      .map((o) => o.data as TEvent)
      .reduce((all, e) => all.concat(e.Records), new Array<TEventRecord>());
    return eventRecords;
  }
}
