import regression from 'regression';

export class PipeResistanceService {

  pipeFunc:any

  constructor() { }

  async findPipeFunc({pipe}) {

    let pipeProperties = pipe.material.properties.map(p => {
      return [parseFloat(p.T) + 273.15, parseFloat(p.K)]
    })
    return regression.polynomial(pipeProperties, { order: 3, precision: 10 });
  }

  async pipeResistance({pipe,params}) {

    let pipeFunc
    if (this.pipeFunc) {
      pipeFunc = this.pipeFunc
    } else {
      pipeFunc = await this.findPipeFunc({pipe})
      this.pipeFunc = pipeFunc
    }

    let predict = pipeFunc.predict(params.operatingTemp)

    let G47 = predict[1]
    return (parseFloat(pipe.outsideDiameter) / 1000) * Math.log(parseFloat(pipe.outsideDiameter) / parseFloat(pipe.insideDiameter)) / (2 * G47)
  }

}
