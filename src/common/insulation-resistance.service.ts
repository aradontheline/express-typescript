import regression from 'regression';

export class InsulationResistanceService {

  insulationFunc:any

  constructor() { }

  
  async findInsulationFunc({insulation}) {

    let insulationProperties = insulation.material.properties.map(p => {
      return [parseFloat(p.T) + 273.15, parseFloat(p.K)]
    })

    return regression.polynomial(insulationProperties, { order: 4, precision: 10 });
  }

  async insulationResistance({insulation,borderTemps}) {
    let insulationFunc
    if (this.insulationFunc) {
      insulationFunc = this.insulationFunc
    } else {
      insulationFunc = await this.findInsulationFunc({insulation})
      this.insulationFunc = insulationFunc
    }

    let predict = insulationFunc.predict((borderTemps[0] + borderTemps[1]) / 2)

    let G51 = predict[1]

    return (parseFloat(insulation.outsideDiameter) / 1000) * Math.log(parseFloat(insulation.outsideDiameter) / parseFloat(insulation.insideDiameter)) / (2 * G51)
  }
}
